#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
#include "functions"
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

// USE_HDR_RGBA8

void main(void)
{
	vec4 rgbe = texture2D(txDiffuse, vec2(TexCoords.x, 1.0f-TexCoords.y) );
#ifdef USE_HDR_RGBA8	
	vec3 color = hdr_decode(rgbe*255.0f);
#else
	vec3 color = rgbe.xyz;
#endif
	gl_FragColor.xyz = color;//gamma(diffuse, 0.75f + 0.25f*cos(Time));
	// gl_FragColor.xyz = vec3(0.7,0.4,0.7);
	gl_FragColor.a = 1.0;
}
