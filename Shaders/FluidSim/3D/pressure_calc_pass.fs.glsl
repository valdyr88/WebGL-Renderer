#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;
precision highp sampler3D;
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
uniform vec4 sphereBarrier; //xyz pozicija, w radius
uniform vec3 sphereBarrierVelocity;
// #define sphereBarrier (vec4(  0.5,0.5+cos(0.25*t)*0.25,0.5,  0.05f))
// #define sphereBarrierVelocity ( 128.0*vec3(0.0,-sin(0.25*t),0.0) )

#define PressureComp x
#define DivergenceComp x
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

#ifdef FINITE_DIFFERENCE_COARSE
	#define norm 6.0
#else
	#define norm 26.0
#endif

float pressureFromSphereBarrier(in float p, in vec3 x, in float t, in float dt){

	vec3 centar = toWorldSpace(sphereBarrier.xyz);
	vec3 toX = x - centar;
	
	if(length(toX) < 0.9*sphereBarrier.w*Resolution.x){
		return 0.0;
	}
	/*
	if(length(toX) < 1.1*sphereBarrier.w*Resolution.x){
		
		vec3 n = normalize(toX);
		vec3 vdir = normalize(sphereBarrierVelocity);
		float vsize = length(sphereBarrierVelocity);
		float dotNV = dot(n,vdir);
		
		return -1.0*dotNV*vsize;
	}
	*/
	return p;
}

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
				
		pnew[i] = (laplace(0.0, txPressure, x, dx) - divu) / norm;
		
		// // if(isAtBorder(x) == true){ pnew[i] =  -divu / 6.0; }
		// if(isAtBorder(x) == true){ pnew[i] = p; }
		// if(isAtBorder(x) == true){ pnew[i] = 0.0; }
		
		// vec3 centar = toWorldSpace(sphereBarrier.xyz);
		// if(length(x - centar) < sphereBarrier.w*Resolution.x) pnew[i] = 0.0;
		pnew[i] = pressureFromSphereBarrier(pnew[i], x, t, dt);
	}
		
	// out_FragColor = pnew;
	WriteOutput(out_FragColor, pnew);
}