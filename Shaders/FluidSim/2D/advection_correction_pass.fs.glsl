#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//MacCormack korekcija advekcije (advekcija je napravljena u prethodnom koraku), output je brzina

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
#endif

uniform vec2 aspect; //odnos dimenzija teksture i svijeta
uniform sampler2D txVelocity;
uniform sampler2D txAdvectedVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

vec2 toTexSpace(vec2 x){ return x*aspect; }
vec2 toWorldSpace(vec2 x){ return x/aspect; }

vec4 samplePoint(sampler2D tx, vec2 x){
	ivec2 txSize = textureSize(tx, 0);
	return texelFetch(tx, ivec2(toTexSpace(x)*txSize)); //sample point
}
vec4 sampleLinear(sampler2D tx, vec2 x){
	return texture2D(tx, toTexSpace(x));
}

vec4 advectReverse(sampler2D u, vec2 x, float dt){
	vec3 uadv = samplePoint(u, x); //sample point
	return sampleLinear(u, x + dt*uadv); //sample linear
}

//===================================================================================================

void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);

	vec4 u = samplePoint(txVelocity, x);
	vec4 uadv = sampleLinear(txAdvectedVelocity, x);
	vec4 uradv = advectReverse(txAdvectedVelocity, x, dT);
		
	vec4 urtn = uadv + 0.5f*(u - uradv);
	//treba clampat urtn ovdje!
	
	gl_FragColor = urtn;
}