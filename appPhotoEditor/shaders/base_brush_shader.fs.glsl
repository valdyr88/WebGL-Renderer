#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;

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
	vec4 old = texture2D(txDiffuse, TexCoords);

	vec2 toPos = Brush.position.xy - TexCoords.xy;
	float distToPos = length(toPos) * 500.0f;
	float invDistToPos = 1.0f / max(0.01f, distToPos);
	invDistToPos = saturate(invDistToPos-0.01f);
	
	vec4 add = invDistToPos*Brush.color;
	
	gl_FragColor = old + add;
}
