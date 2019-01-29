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
// uniform samplerCube txAmbient;

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
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	
	gl_FragColor = diffuse;
	gl_FragColor.a = 1.0;
}
