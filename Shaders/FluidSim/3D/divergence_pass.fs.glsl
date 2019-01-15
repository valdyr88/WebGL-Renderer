#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;
precision highp sampler3D;
//racunanje divergencije, output je scalar

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
uniform sampler3D txTexture;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"
/* 
float divergence(sampler3D tx, vec3 x){
	//za 3D treba 6 susjednih samplirat
	
	vec4 u[6];
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	u[0] = samplePoint(tx, x + vec3( dx.x,  0.0,  0.0));
	u[1] = samplePoint(tx, x + vec3(-dx.x,  0.0,  0.0));
	u[2] = samplePoint(tx, x + vec3(  0.0, dx.y,  0.0));
	u[3] = samplePoint(tx, x + vec3(  0.0,-dx.y,  0.0));
	u[4] = samplePoint(tx, x + vec3(  0.0,  0.0, dx.z));
	u[5] = samplePoint(tx, x + vec3(  0.0,  0.0,-dx.z));
	
	return 0.5*((u[0].x - u[1].x) + (u[2].y - u[3].y) + (u[4].z - u[5].z));
} */

//===================================================================================================

void main(void)
{	
	float udiv[NUM_OUT_BUFFERS];
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{
		vec3 x = toWorldSpace(TexCoords, z+i);
		
		udiv[i] = divergence(txTexture, x, dx);
	}
	
	// gl_FragColor = udiv;
	WriteOutput(gl_FragColor, udiv);
}
