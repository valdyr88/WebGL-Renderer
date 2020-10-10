#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
#include "defines"
#include "functions"
#include "structs"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
	// layout(location = 1) out vec4 out_Normal;
	// layout(location = 2) out vec4 out_AoRSMt;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

// #define PI (3.14159265359)

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
uniform samplerCube txAmbient;
uniform sampler2D txBRDF;
uniform sampler2D txDepth;
uniform sampler2D txBackground;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;

uniform float emissionMult;
uniform vec3 roughnessScaleOffsetPower;
#define rSOP roughnessScaleOffsetPower

uniform highp mat4 ViewMatrix;
uniform highp mat4 ProjectionMatrix;
//------------------------------------------------------------------------------
#define varyin in

varyin vec3 Normal;
varyin vec3 Tangent;
varyin vec3 Bitangent;
varyin vec3 PixelPosition;
varyin vec2 TexCoords;
varyin vec3 Position;
varyin vec3 ViewVector;

#include "pbr"

//------------------------------------------------------------------------------
// uniform Light light0;
#include "ubLight"

#define isAoRMt_bit 0

// #define debug_PerfectReflection

inline vec3 sampleBackground(sampler2D tx, vec2 t, float r){

#ifndef NOF_BACKGOUND_MIPMAPS
	#define NOF_BACKGOUND_MIPMAPS 9.0
#endif
	
#ifdef USE_HDR_RGBA8	
	float l = r * NOF_BACKGOUND_MIPMAPS;
	float l0 = floor(l);
	float l1 = ceil(l);

	vec4 argbe = textureLod(tx, t, l0);
	vec4 brgbe = textureLod(tx, t, l1);
	
	vec3 a = hdr_decode(argbe);
	vec3 b = hdr_decode(brgbe);
	
	float lt = l - l0;
	
	return lerp(a, b, lt);
#else
	float l = r * NOF_BACKGOUND_MIPMAPS;
	return textureLod(tx, t, l).xyz;
#endif
	
}

void main(void)
{
	Light light0 = Lights[0].light;
	
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	vec4 normaltx = texture2D(txNormal, TexCoords);
	vec4 AoRSEm = texture2D(txAoRS, TexCoords);
	
	float roughness = sqrt(AoRSEm.y);
	float ambientOcclusion = AoRSEm.a;//1.0;//
	ambientOcclusion = 1.0f;
	float emission = gamma( 0.05f*emissionMult*AoRSEm.w, 1.0f/2.2f);
	
	roughness = pow( saturate( roughness*rSOP.x + rSOP.y ), rSOP.z );
	
	float Metalness = 0.0f;
	float3 specular = float3( AoRSEm.z*0.22f );
	
	if(uint_getbit(uFlags, isAoRMt_bit) == true){
		specular = float3( lerp( tofloat3(max(AoRSEm.z,0.22f)), diffuse.xyz, AoRSEm.z ));
		Metalness = AoRSEm.z;
	}
	
	#ifdef debug_PerfectReflection
		diffuse = tovec4(1.0f);
		AoRSEm = vec4(1.0f, 0.0f, 1.0f, 1.0f);
		ambientOcclusion = 1.0f;
		specular = vec3(1.0f,1.0f,1.0f);
		Metalness = 1.0f;
		roughness = 0.0f;
	#endif
	
	float3 V = normalize(-ViewVector);
	float3 N = normalize(Normal);
	float3 R = reflect(N,V);
	
	mat3 NormalMatrix = CreateRotationMatrix(normalize(Tangent), normalize(Bitangent), N);
	
	vec3 normal = normaltx.xyz*2.0 - 1.0;
	normal.xy *= 0.25f;
	normal = normalize(NormalMatrix * normal);
	
	float mipLevel = (cos(Time*0.4)+1.0)/2.0;
	vec4 Amb = textureCubeLod(txAmbient, -normal.xyz, 7.0*roughness);
	float ambMult = 2.0*(cos(Time*0.4) + 1.0)+0.75;
	
	Light lights[1]; //{ light0, light0, light0, light0,};
	lights[0] = light0;
	
	float3 reflected = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	diffuse.xyz = vec3(1.0f);
	
	for(int i = 0; i < 1; ++i)
		pbr_SampleLight(Position.xyz, diffuse.xyz, normal.xyz, specular.xyz, roughness, Metalness, 1.0f, ViewVector, lights[i], lightdiff, lightrefl);
	pbr_SampleAmbient(diffuse.xyz, normal.xyz, specular.xyz, roughness, Metalness, ambientOcclusion, ViewVector, txAmbient, AMBIENT_LIGHT_INCREASE_PERCENTAGE, lightdiff, lightrefl);
	
	reflected = pbr_IntegrateSamples(diffuse.xyz, Metalness, lightdiff, lightrefl);
	
	vec3 viewspaceNormal = (ProjectionMatrix * (ViewMatrix * tovec4(normal,0.0f))).xyz;
	
	vec2 offset = -(viewspaceNormal.xy)*abs(viewspaceNormal.xy)*0.05f; //ToDo: pretvorit 0.15f u parametar
	vec3 background = sampleBackground(txBackground, PixelPosition.xy + offset, (roughness*roughness));
	
	float dotVN = dot(V,N);
	vec3 refl = fresnel(0.025f, saturate(dotVN), saturate(roughness));
	vec3 outcolor = lerp(background, reflected, refl);
	
	#ifdef USE_HDR_RGBA8
		gl_FragColor = hdr_encode(outcolor.xyz);
	#else
		gl_FragColor = tovec4(outcolor,1.0f);
	#endif
}
