#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#include "defines"
#include "functions"
#include "structs"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor glFragColor
	out vec4 glFragColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
uniform sampler2D txDepth;
uniform sampler2D txBRDF;
uniform samplerCube txAmbient;

uniform mat4 InverseViewProjectionMatrix;

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
uniform Light light0;

//------------------------------------------------------------------------------

vec3 shade_hdr_decode(vec4 rgbe){
	rgbe = 255.0*rgbe;
	return hdr_decode(rgbe);
}

vec3 shade_pbr(vec4 diffuse, vec3 normal, vec4 AoRSMt, float depth, float2 texCoord, mat4 InvVPMat){
	
	float roughness = AoRSMt.y;
	float ambientOcclusion = AoRSMt.x;
	
	float metalness = 0.0f;
	float3 specular = float3( AoRSMt.z*0.22f );
	
	normal = 2.0f*normal - 1.0f;
	vec3 position = PositionFromDepth(texCoord, depth, InvVPMat);
	
	if(AoRSMt.a > 0.99f){
		specular = float3( lerp( tofloat3(max(AoRSMt.z,0.22f)), diffuse.xyz, AoRSMt.z ));
		metalness = AoRSMt.z;
	}
	
	// roughness = 0.0f;
	
	Light lights[1];
	lights[0] = light0;
	lights[0].intensity = 1.0f;
	lights[0].color = tofloat3(1.0f);
		
	float3 reflected = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	
	for(int i = 0; i < 1; ++i)
		PBR_SampleLight(position.xyz, diffuse.xyz, normal.xyz, specular.xyz, roughness, metalness, 1.0f, ViewVector, lights[i], lightdiff, lightrefl);
	PBR_SampleAmbient(diffuse.xyz, normal.xyz, specular.xyz, roughness, metalness, ambientOcclusion, ViewVector, txAmbient, 0.0f, lightdiff, lightrefl);
	
	reflected = PBR_IntegrateSamples(diffuse.xyz, metalness, lightdiff, lightrefl);
	
	return reflected;
}

void main(void)
{
	vec4 diffuse = texture2D(txDiffuse, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	vec4 normal = texture2D(txNormal, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	vec4 AoRSMt = texture2D(txAoRS, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	float depth = texture2D(txDepth, vec2(TexCoords.x, 1.0f-TexCoords.y) ).x;
	
	int ShaderID = deferred_read_shader_type(normal.a);
	
	// vec3 position = PositionFromDepth(vec2(TexCoords.x, 1.0f-TexCoords.y), depth, InverseViewProjectionMatrix);
	
	vec3 shade = vec3(1.0, 0.6, 0.2);
	
	switch(ShaderID){
		case deferred_shader_pbr: shade = shade_pbr(diffuse, normal.xyz, AoRSMt, depth, vec2(TexCoords.x, 1.0f-TexCoords.y), InverseViewProjectionMatrix); break;
		case deferred_shader_hdre: shade = shade_hdr_decode(diffuse); break;
		case deferred_shader_simpleColor: shade = diffuse.xyz; break;
		default: break;
	}
	
	// float d = desaturate(shade);
	// shade = tovec3(d);
	// if(d > 1.0f) shade = vec3(0.7,0.1,0.9);
	
	gl_FragColor.xyz = shade;
	gl_FragColor.a = 1.0;
}
