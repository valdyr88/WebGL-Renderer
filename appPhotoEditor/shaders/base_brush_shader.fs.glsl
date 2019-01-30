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

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;

//------------------------------------------------------------------------------
#include "ubBrush"

void main(void)
{	
	vec2 toPos = Brush.position.xy - TexCoords.xy;
	float distToPos = length(toPos) * 500.0;
	float invDistToPos = 1.0 / max(0.01, distToPos);
	
	gl_FragColor = invDistToPos*Brush.color;
}
