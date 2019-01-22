#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;
precision highp sampler3D;
//racuna divergence free velocity, output je velocity

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor[NUM_OUT_BUFFERS];
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
uniform sampler3D txVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"



//racuna divergence free brzinu
void main(void)
{
	vec4 u[NUM_OUT_BUFFERS];	
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		vec3 x = toWorldSpace(TexCoords, z+i);
		
		vec4 gradP = tovec4(gradient(txPressure, x, dx),0.0);
		vec4 oldU = samplePoint(txVelocity, x);
				
		u[i] = oldU - gradP;
		
		if(isAtBorder(x, 1) == true) u[i] = vec4(0.0);
	}
	
	// gl_FragColor = u;
	WriteOutput(gl_FragColor, u);
}