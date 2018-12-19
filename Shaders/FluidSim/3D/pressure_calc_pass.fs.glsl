#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
precision mediump sampler3D;
//racuna pressure, output je scalar. Jacobi iteration.

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out float out_FragColor[NUM_OUT_BUFFERS];
	// layout(location = 1) out vec4 out_Normal;
	// layout(location = 2) out vec4 out_AoRSMt;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
	#define texture2DLod textureLod
	#define texture3DLod textureLod
#endif

uniform int z;
uniform vec3 aspect; //odnos dimenzija teksture i svijeta
uniform sampler3D txPressure;
uniform sampler3D txDivergence;
uniform float dT;
uniform float Time;

#define PressureComp x
#define DivergenceComp x
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

//racuna pressure
void main(void)
{	
	float dt = dT; float t = Time;
	float pnew[NUM_OUT_BUFFERS];
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{
		vec3 x = toWorldSpace(TexCoords, z+i);
		
		float divu = samplePoint(txDivergence, x).DivergenceComp;
		float p = samplePoint(txPressure, x).PressureComp;
		
		const vec3 dx = vec3(1.0,1.0,1.0);
		
		float ps[6];
		//za 3D treba 6 susjednih samplirat
		ps[0] = samplePoint(txPressure, x + vec3( dx.x,  0.0,  0.0), vec4(0.0)).PressureComp;
		ps[1] = samplePoint(txPressure, x + vec3(-dx.x,  0.0,  0.0), vec4(0.0)).PressureComp;
		ps[2] = samplePoint(txPressure, x + vec3(  0.0, dx.y,  0.0), vec4(0.0)).PressureComp;
		ps[3] = samplePoint(txPressure, x + vec3(  0.0,-dx.y,  0.0), vec4(0.0)).PressureComp;
		ps[4] = samplePoint(txPressure, x + vec3(  0.0,  0.0, dx.z), vec4(0.0)).PressureComp;
		ps[5] = samplePoint(txPressure, x + vec3(  0.0,  0.0,-dx.z), vec4(0.0)).PressureComp;
			
		pnew[i] = (ps[0] + ps[1] + ps[2] + ps[3] + ps[4] + ps[5] - divu) / 6.0;
		// // if(isAtBorder(x) == true){ pnew[i] =  -divu / 6.0; }
		// if(isAtBorder(x) == true){ pnew[i] = p; }
		// if(isAtBorder(x) == true){ pnew[i] = 0.0; }
		vec3 centar = toWorldSpace(vec3(0.2,0.5+cos(0.25*t)*0.25,0.5));
		if(length(x - centar) < 0.05f*Resolution.x) pnew[i] = 0.0;
	}
		
	// out_FragColor = pnew;
	WriteOutput(out_FragColor, pnew);
}