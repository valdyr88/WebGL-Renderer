#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//MacCormack korekcija advekcije (advekcija je napravljena u prethodnom koraku). input je advected brzina, output je brzina

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
uniform sampler2D txAdvectedVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

vec4 advectReverse(sampler2D u, vec2 x, float dt){
	vec4 uadv = samplePoint(u, x); //sample point
	return sampleLinear(u, x + dt*uadv.xy); //sample linear
}

void getMinMaxNearestNeighborValues(sampler2D u, vec2 x, out vec4 vMin, out vec4 vMax){
	//za 3D treba 8 susjednih samplirat
	vec2 h = vec2(0.5,0.5);
	x = floor(x + h);
	
	vec4 v[4];
	v[0] = samplePoint(u, x + vec2(-h.x, 0.0));
	v[1] = samplePoint(u, x + vec2( h.x, 0.0));
	v[2] = samplePoint(u, x + vec2( 0.0,-h.y));
	v[3] = samplePoint(u, x + vec2( 0.0, h.y));
	
	vMin = min(min(min(v[0],v[1]),v[2]),v[3]);
	vMax = max(max(max(v[0],v[1]),v[2]),v[3]);
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
	
	vec4 vMin, vMax; getMinMaxNearestNeighborValues(txVelocity, x, vMin, vMax);
	urtn = max(min(urtn, vMax), vMin);
	
	if(isAtBorder(x)) urtn = uadv;
	
	gl_FragColor = urtn;
	gl_FragColor.a = 1.0;
}