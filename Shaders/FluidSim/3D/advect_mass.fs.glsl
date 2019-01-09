#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//Advekcija mase

precision mediump float;
precision mediump sampler3D;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if defined(bHasColorComponent)
	#if bHasColorComponent == 1
		#define out_dim vec4
		#define out_comp xyzw
	#else
		#define out_dim float
		#define out_comp x
	#endif
#else
	#define bHasColorComponent 0
	#define out_dim float
	#define out_comp x
#endif

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out out_dim out_FragColor[NUM_OUT_BUFFERS];
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
uniform sampler3D txMass; //(r) density ili (rgb) boja i (a) density
uniform sampler3D txVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"
// #define MassResolution

out_dim advect(sampler3D u, sampler3D m, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return sampleLinear(m, x - dt*v.xyz).out_comp; //sample linear
}

//===================================================================================================

void main(void)
{
	out_dim uadv[NUM_OUT_BUFFERS];

	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		vec3 x = toWorldSpace(TexCoords, z+i);
		uadv[i] = advect(txVelocity, txMass, x, dT);
	}
	
	// gl_FragColor = uadv;
	WriteOutput(gl_FragColor, uadv);
}