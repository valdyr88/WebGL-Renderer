#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txColor;
uniform sampler2D txGlow;
uniform sampler2D txVFogShadows;

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

//------------------------------------------------------------------------------

vec4 sampleLodCombine(sampler2D tx, vec2 t, float LODStart, float dLOD, const int LODCount){
	vec4 sum = vec4(0.0f);
	float LOD = LODStart;
	
	for(int i = 0; i < LODCount; ++i){
		sum += textureLod(tx, t, LOD);
		LOD += dLOD;
	}
	
	return sum/float(LODCount);
}

void main(void)
{
	vec4 color  = texture2D(txColor, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	vec4 glow   = sampleLodCombine(txGlow, vec2(TexCoords.x, 1.0f-TexCoords.y), 4.0f, 0.7f, 5 );
	float vfshadows = texture2D(txVFogShadows, vec2(TexCoords.x, 1.0f-TexCoords.y) ).x;
	
	color.rgb = pow(color.rgb, vec3(2.0f-1.0f*vfshadows)) + 5.0f*glow.rgb;
	// color = textureLod(txGlow, vec2(TexCoords.x, 1.0f-TexCoords.y), 4.0f);
	
	#ifdef USE_HDR_RGBA8
		gl_FragColor = hdr_encode(color.xyz);
	#else
		gl_FragColor = tovec4(color.xyz,1.0f);
	#endif
}
