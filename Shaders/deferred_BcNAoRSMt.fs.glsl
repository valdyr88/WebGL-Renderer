#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
	layout(location = 1) out vec4 out_Normal;
	layout(location = 2) out vec4 out_AoRSMt;
	
/* 	#define gl_FragColor out_FragColor[0]
	#define out_Normal out_FragColor[1]
	#define out_AoRSMt out_FragColor[2]
	layout(location = 0) out vec4 out_FragColor[3]; */
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

//------------------------------------------------------------------------------

#define isAoRMt_bit 0

// #define debug_PerfectReflection

void main(void)
{	
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	vec4 normaltx = texture2D(txNormal, TexCoords);
	vec4 AoRS = texture2D(txAoRS, TexCoords);
	// diffuse = tovec4(1.0f);
	
	float roughness = sqrt(AoRS.y);
	float ambientOcclusion = AoRS.a;//1.0;//
	// ambientOcclusion = 1.0f;
	
	float Metalness = float(uint_getbit(uFlags, isAoRMt_bit) == true);
	float3 specular = float3( AoRS.z*0.22f );
	
	/* if(uint_getbit(uFlags, isAoRMt_bit) == true){
		specular = float3( lerp( tofloat3(max(AoRS.z,0.22f)), diffuse.xyz, AoRS.z ));
		Metalness = AoRS.z;
	} */
	
	#ifdef debug_PerfectReflection
		diffuse = tovec4(1.0f);
		AoRS = vec4(1.0f, 0.0f, 1.0f, 1.0f);
		ambientOcclusion = 1.0f;
		specular = vec3(1.0f,1.0f,1.0f);
		Metalness = 1.0f;
		roughness = 0.0f;
	#endif
	
	mat3 NormalMatrix = CreateRotationMatrix(Tangent, Bitangent, Normal);
	
	// if(uFlags == 1) normaltx.y = 1.0-normaltx.y;
	// if(uint_getbit(uFlags, 2) == true) normaltx.y = 1.0-normaltx.y;
	// if(getBitFlag(2) == true) normaltx.y = 1.0-normaltx.y;
	vec3 normal = normaltx.xyz*2.0f - 1.0f;
	normal = NormalMatrix * normal;
	normal = 0.5f*normal + 0.5f;
	
	// out
	//------------------------------------------------------------------------------------
	gl_FragColor = diffuse;
	
	out_Normal.xyz = normal.xyz;
	out_Normal.a = deferred_store_shader_type( deferred_shader_pbr );
	
	out_AoRSMt = vec4( ambientOcclusion, roughness, AoRS.z, Metalness );
	
}
