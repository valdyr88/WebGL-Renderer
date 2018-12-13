#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//Advekcija brzine, (jedan pass), nakon ovog moze ici MacCormack korekcija. input je brzina nakon viscosity, output je advected brzina

precision mediump float;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
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
uniform sampler2D txVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

vec4 advect(sampler2D u, vec2 x, float dt){
	vec4 v = sampleLinear(u, x); //sample point
	return sampleLinear(u, x - dt*v.xy); //sample linear
}

//===================================================================================================

void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);
	vec4 uadv = advect(txVelocity, x, dT);
			
	gl_FragColor = uadv;
	gl_FragColor.a = 1.0;
}