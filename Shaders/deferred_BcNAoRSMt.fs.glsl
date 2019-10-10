#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#define UseEmissiveChannel

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
	layout(location = 1) out vec4 out_Normal;
	layout(location = 2) out vec4 out_AoRSMt;
	
#ifdef UseEmissiveChannel
	layout(location = 3) out vec4 out_Emissive;
#endif

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

uniform float emissionMult;
uniform vec3 roughnessScaleOffsetPower;
#define rSOP roughnessScaleOffsetPower
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

#define isAoRMt_bit 0 //is AoRMt instead of AoRS

// #define debug_PerfectReflection

float encode_MetalnessBit(float value, bool bMetalness){
	uint bits = uint(127.0f*value) << 1 | uint(bMetalness);
	return float(bits)/255.0f;
}

void main(void)
{	
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	vec4 normaltx = texture2D(txNormal, TexCoords);
	vec4 AoRSEm = texture2D(txAoRS, TexCoords);
	// diffuse = tovec4(1.0f);
	
	float roughness = AoRSEm.y;
	float ambientOcclusion = AoRSEm.r;//1.0;//
	// ambientOcclusion = 1.0f;
	float specular = AoRSEm.z;
	float emission = gamma( 0.05f*emissionMult*AoRSEm.w, 1.0f/2.2f);
	
	roughness = pow( saturate( roughness*rSOP.x + rSOP.y ), rSOP.z );
	
	bool bMetalness = (uint_getbit(uFlags, isAoRMt_bit));
	
	/* if(uint_getbit(uFlags, isAoRMt_bit) == true){
		specular = float3( lerp( tofloat3(max(AoRSEm.z,0.22f)), diffuse.xyz, AoRSEm.z ));
		Metalness = AoRSEm.z;
	} */
		
	#ifdef debug_PerfectReflection
		diffuse = tovec4(1.0f);
		AoRSEm = vec4(1.0f, 0.0f, 1.0f, 1.0f);
		ambientOcclusion = 1.0f;
		bMetalness = true;
		roughness = 0.0f;
		specular = 1.0f;
		normaltx.xyz = vec3(0.5f,0.5f,1.0f);
	#endif
	
	mat3 NormalMatrix = CreateRotationMatrix(Tangent, Bitangent, Normal);
	
	// if(uFlags == 1) normaltx.y = 1.0-normaltx.y;
	// if(uint_getbit(uFlags, 2) == true) normaltx.y = 1.0-normaltx.y;
	// if(getBitFlag(2) == true) normaltx.y = 1.0-normaltx.y;
	vec3 normal = normaltx.xyz*2.0f - 1.0f;
	normal = NormalMatrix * normal;
	// normal = 0.5f*normal + 0.5f;
	
	// out
	//------------------------------------------------------------------------------------
	gl_FragColor = diffuse;
	
	out_Normal.xyz = packNormalToRGB8(normal.xyz);
	out_Normal.a = deferred_store_shader_type( deferred_shader_pbr );
	
	out_AoRSMt.x = ambientOcclusion;
	out_AoRSMt.y = roughness;
	out_AoRSMt.z = specular;
	out_AoRSMt.w = encode_MetalnessBit(emission, bMetalness);
}
