#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//racunanje divergencije, output je scalar

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out float out_FragColor;
	// layout(location = 1) out vec4 out_Normal;
	// layout(location = 2) out vec4 out_AoRSMt;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
	#define texture2DLod textureLod
#endif

uniform vec2 aspect; //odnos dimenzija teksture i svijeta
uniform sampler2D txTexture;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

float divergence(sampler2D tx, vec2 x){
	//za 3D treba 6 susjednih samplirat
	
	vec4 u[4];
	const vec2 dx = vec2(1.0,1.0);
	
	u[0] = samplePoint(tx, x + vec2(dx.x, 0.0));
	u[1] = samplePoint(tx, x + vec2(-dx.x,0.0));
	u[2] = samplePoint(tx, x + vec2(0.0, dx.y));
	u[3] = samplePoint(tx, x + vec2(0.0,-dx.y));
	
	return 0.5*((u[0].x - u[1].x) + (u[2].y - u[3].y));
}

//===================================================================================================

void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);
	
	float udiv = divergence(txTexture, x);
	
	gl_FragColor = udiv;
}
