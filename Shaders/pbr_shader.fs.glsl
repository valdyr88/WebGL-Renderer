#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
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

#define PI (3.14159265359)

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
uniform samplerCube txAmbient;
uniform sampler2D txBRDF;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
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

void main(void)
{
	Light light0 = Lights[0].light;
	gl_FragColor = vec4(Normal.xyz*0.5+0.5, 1.0);
	// Light light = CreateLight(vec3(0.0, 0.0, 10.0), 20.0);
	float I = Light_Calculate(light0, Position);
	
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	vec4 normaltx = texture2D(txNormal, TexCoords);
	vec4 AoRS = texture2D(txAoRS, TexCoords);
	// diffuse = tovec4(1.0f);
	
	float roughness = sqrt(AoRS.y);
	float ambientOcclusion = AoRS.a;//1.0;//
	ambientOcclusion = 1.0f;
	
	float Metalness = 0.0f;
	float3 specular = float3( AoRS.z*0.22f );
	
	if(uint_getbit(uFlags, isAoRMt_bit) == true){
		specular = float3( lerp( tofloat3(max(AoRS.z,0.22f)), diffuse.xyz, AoRS.z ));
		Metalness = AoRS.z;
	}
	
	#ifdef debug_PerfectReflection
		diffuse = tovec4(1.0f);
		AoRS = vec4(1.0f, 0.0f, 1.0f, 1.0f);
		ambientOcclusion = 1.0f;
		specular = vec3(1.0f,1.0f,1.0f);
		Metalness = 1.0f;
		roughness = 0.0f;
	#endif
	
	// roughness = 0.0f;
	
	mat3 NormalMatrix = CreateRotationMatrix(Tangent, Bitangent, Normal);
	
	// if(uFlags == 1) normaltx.y = 1.0-normaltx.y;
	// if(uint_getbit(uFlags, 2) == true) normaltx.y = 1.0-normaltx.y;
	// if(getBitFlag(2) == true) normaltx.y = 1.0-normaltx.y;
	vec3 normal = normaltx.xyz*2.0 - 1.0;
	normal = NormalMatrix * normal;
	
	float l = dot(normal.xyz, Light_DirToLight(light0, Position))*0.5+0.5;
	
	vec3 dir = Light_DirToLight(light0, Position);	
	
	float mipLevel = (cos(Time*0.4)+1.0)/2.0;
	vec4 Amb = textureCubeLod(txAmbient, -normal.xyz, 7.0*AoRS.y);
	float ambMult = 2.0*(cos(Time*0.4) + 1.0)+0.75;
	
	Light lights[1]; //{ light0, light0, light0, light0,};
	lights[0] = light0;
	lights[0].intensity = 1.0f;
	lights[0].color = tofloat4(1.0f);
	
	// float3 reflected = PBR_Sample(diffuse.xyz, normal.xyz, specular.xyz, roughness, Metalness, 1.0f, ambientOcclusion, ViewVector, txAmbient, AMBIENT_LIGHT_INCREASE_PERCENTAGE, lights, 1);
		
	float3 reflected = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	
	for(int i = 0; i < 1; ++i)
		PBR_SampleLight(Position.xyz, diffuse.xyz, normal.xyz, specular.xyz, roughness, Metalness, 1.0f, ViewVector, lights[i], lightdiff, lightrefl);
	PBR_SampleAmbient(diffuse.xyz, normal.xyz, specular.xyz, roughness, Metalness, ambientOcclusion, ViewVector, txAmbient, AMBIENT_LIGHT_INCREASE_PERCENTAGE, lightdiff, lightrefl);
	
	reflected = PBR_IntegrateSamples(diffuse.xyz, Metalness, lightdiff, lightrefl);
	
	// gl_FragColor.xyz = vec3(1.0)*saturate(l);
	
	float4 rgbe = hdr_encode(reflected);
	int R = int(rgbe.r); int G = int(rgbe.g); int B = int(rgbe.b); int E = int(rgbe.a);
	float3 reflected_encoded = hdr_decode(vec4( float(R),float(G),float(B),float(E) ));
	
	gl_FragColor.xyz = reflected_encoded;	
	// bool bit = (uint_getbit(uFlags, isAoRMt_bit) == true);
	// gl_FragColor.xyz = tovec3( float(bit)  );
	// gl_FragColor.xy = SampleBRDF(TexCoords.xy); gl_FragColor.z = 0.0f;
	
	gl_FragColor.a = 1.0;
	
	// gl_FragColor = rgbe / 255.0f;
}
