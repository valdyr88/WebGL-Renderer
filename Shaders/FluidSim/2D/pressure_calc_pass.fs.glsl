#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//racuna pressure, output je scalar. Jacobi iteration.

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
uniform sampler2D txPressure;
uniform sampler2D txDivergence;
uniform float dT;

#define PressureComp x
#define DivergenceComp x
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

//racuna pressure
void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);
	
	ivec2 size = textureSize(txDivergence, 0);
	
	float divu = samplePoint(txDivergence, size, x).DivergenceComp;
	float p = samplePoint(txPressure, size, x).PressureComp;
	
	const vec2 dx = vec2(1.0,1.0);
	
	float ps[4];
	//za 3D treba 6 susjednih samplirat
	ps[0] = samplePoint(txPressure, size, x + vec2( dx.x, 0.0)).PressureComp;
	ps[1] = samplePoint(txPressure, size, x + vec2(-dx.x, 0.0)).PressureComp;
	ps[2] = samplePoint(txPressure, size, x + vec2( 0.0, dx.y)).PressureComp;
	ps[3] = samplePoint(txPressure, size, x + vec2( 0.0,-dx.y)).PressureComp;
	
	// float pnew = p + (divu - (ps[0] + ps[1] + ps[2] + ps[3] - 4.0*p));
	float pnew = (ps[0] + ps[1] + ps[2] + ps[3] - divu) / 4.0;
	if(isAtBorder(x) == true){ pnew = -divu / 4.0; }
		
	out_FragColor = pnew;
}