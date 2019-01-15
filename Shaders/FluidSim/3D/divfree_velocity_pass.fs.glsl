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

#define GradComp x

/*vec4 gradient(sampler3D tx, vec3 x){
	
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	float u[6];
	//za 3D treba 6 susjednih samplirat
	u[0] = samplePoint(tx, x + vec3( dx.x,  0.0,  0.0)).GradComp;
	u[1] = samplePoint(tx, x + vec3(-dx.x,  0.0,  0.0)).GradComp;
	u[2] = samplePoint(tx, x + vec3(  0.0, dx.y,  0.0)).GradComp;
	u[3] = samplePoint(tx, x + vec3(  0.0,-dx.y,  0.0)).GradComp;
	u[4] = samplePoint(tx, x + vec3(  0.0,  0.0, dx.z)).GradComp;
	u[5] = samplePoint(tx, x + vec3(  0.0,  0.0,-dx.z)).GradComp;
	
	vec4 grad = 0.5*vec4( u[0]-u[1], u[2]-u[3], u[4]-u[5], 0.0 );
	return grad;
}*/

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
	}
	
	// gl_FragColor = u;
	WriteOutput(gl_FragColor, u);
}