#version 300 es
//cubemap rendered and hdr encoded in rgbe and output to 0-th render buffer
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

uniform samplerCube txAmbient;

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

void main(void)
{
	vec4 Amb = textureCube(txAmbient, -Normal.xyz); 
	Amb.xyz *= 0.25f;
	Amb.xyz = gamma(Amb.xyz, 0.5f);
#ifdef USE_HDR_RGBA8
	float4 rgbe = hdr_encode(Amb.xyz);	
	gl_FragColor = rgbe / 255.0f;
	out_Normal.a = deferred_store_shader_type( deferred_shader_hdre );
#else
	gl_FragColor = Amb;
	out_Normal.a = deferred_store_shader_type( deferred_shader_simpleColor );
#endif	
	out_Normal.xyz = vec3(0.0f, 0.0f, 0.0f);
}
