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

uniform int z;
uniform vec3 aspect; //odnos dimenzija teksture i svijeta
uniform sampler2D txPressure;
uniform sampler2D txDivergence;
uniform float dT;
uniform float Time;

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
	vec3 x = toWorldSpace(TexCoords, z);
	float dt = dT; float t = Time;
	
	float divu = samplePoint(txDivergence, x).DivergenceComp;
	float p = samplePoint(txPressure, x).PressureComp;
	
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	float ps[4];
	//za 3D treba 6 susjednih samplirat
	ps[0] = samplePoint(txPressure, x + vec2( dx.x, 0.0), vec4(0.0)).PressureComp;
	ps[1] = samplePoint(txPressure, x + vec2(-dx.x, 0.0), vec4(0.0)).PressureComp;
	ps[2] = samplePoint(txPressure, x + vec2( 0.0, dx.y), vec4(0.0)).PressureComp;
	ps[3] = samplePoint(txPressure, x + vec2( 0.0,-dx.y), vec4(0.0)).PressureComp;
		
	float pnew = (ps[0] + ps[1] + ps[2] + ps[3] - divu) / 4.0;
	// // if(isAtBorder(x) == true){ pnew =  -divu / 4.0; }
	// if(isAtBorder(x) == true){ pnew = p; }
	// if(isAtBorder(x) == true){ pnew = 0.0; }
	vec2 centar = toWorldSpace(vec2(0.2,0.5+cos(0.25*t)*0.25));
	if(length(x - centar) < 10.0) pnew = 0.0;
		
	out_FragColor = pnew;
}