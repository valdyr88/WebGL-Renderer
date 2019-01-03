#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//Advekcija npr cloudsa

precision mediump float;
precision mediump sampler3D;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor[NUM_OUT_BUFFERS];
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
uniform sampler3D txVelocity;
uniform sampler3D txMass; //(r) density ili (rgb) boja i (a) density
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"
// #define MassResolution

vec4 advect(sampler3D u, sampler3D m, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return sampleLinear(m, x - dt*v.xyz); //sample linear
}

//===================================================================================================

void main(void)
{
	vec4 uadv[NUM_OUT_BUFFERS];

	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		vec3 x = toWorldSpace(TexCoords, z+i);
		uadv[i] = advect(txVelocity, x, dT);
	}
			
	// gl_FragColor = uadv;
	WriteOutput(gl_FragColor, uadv);
}