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
	float4 dither = 0.0275f*(randf4(TexCoords+vec2(sBrush_getRandom(), 1.0-sBrush_getRandom())));
	
	vec4 old = texture2D(txDiffuse, TexCoords);
			
	float dT = sBrush_getdTime();
	vec2 toPos = sBrush_getPosition().xy - TexCoords.xy;
	float distToPos = length(toPos) * 500.0f;
	float invDistToPos = 1.0f / max(0.01f, distToPos);
	invDistToPos = saturate(invDistToPos-0.01f);
	
	vec4 add = (vec4(10.0)+150.0*dither)*dT*invDistToPos*sBrush_getColor();
	
	if(sBrush_isPressed() == true){
		gl_FragColor = old + add; }
	else {
		gl_FragColor = old; }
	gl_FragColor.a = length(glFragColor.xyz);
}
