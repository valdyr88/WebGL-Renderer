#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//MacCormack korekcija advekcije (advekcija je napravljena u prethodnom koraku). input je advected brzina, output je brzina

precision highp float;
precision highp sampler3D;

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
uniform sampler3D txVelocity;
uniform sampler3D txAdvectedVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

vec4 advectReverse(sampler3D u, vec3 x, float dt){
	vec4 uadv = samplePoint(u, x); //sample point
	return sampleLinear(u, x + dt*uadv.xyz); //sample linear
}

vec3 advectPosition(sampler3D u, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return x - dt*v.xyz;
}

void getMinMaxNearestNeighbourValues(sampler3D u, vec3 x, out vec4 vMin, out vec4 vMax){
	//za 3D treba 8 susjednih samplirat
	vec3 h = vec3(0.5,0.5,0.5);
	x = floor(x + h);
	
	vec4 v[8];
	v[0] = samplePoint(u, x + vec3(-h.x,-h.y,-h.z));
	v[1] = samplePoint(u, x + vec3(-h.x,-h.y, h.z));
	v[2] = samplePoint(u, x + vec3(-h.x, h.y,-h.z));
	v[3] = samplePoint(u, x + vec3(-h.x, h.y, h.z));
	v[4] = samplePoint(u, x + vec3( h.x,-h.y,-h.z));
	v[5] = samplePoint(u, x + vec3( h.x,-h.y, h.z));
	v[6] = samplePoint(u, x + vec3( h.x, h.y,-h.z));
	v[7] = samplePoint(u, x + vec3( h.x, h.y, h.z));
	
	vMin = min(min(min(min(min(min(min(v[0],v[1]),v[2]),v[3]),v[4]),v[5]),v[6]),v[7]);
	vMax = max(max(max(max(max(max(max(v[0],v[1]),v[2]),v[3]),v[4]),v[5]),v[6]),v[7]);
}

vec4 clampVelocity(vec4 v, sampler3D u, vec3 x, float dt){
	vec3 xv = advectPosition(u, x, dt);
	vec4 vMin, vMax; getMinMaxNearestNeighbourValues(u, xv, vMin, vMax);
	return max(min(v, vMax), vMin);
}

//===================================================================================================

void main(void)
{	
	vec4 urtn[NUM_OUT_BUFFERS];
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{
		vec3 x = toWorldSpace(TexCoords, z+i);

		vec4 u = samplePoint(txVelocity, x);
		vec4 uadv = samplePoint(txAdvectedVelocity, x);
		vec4 uradv = advectReverse(txAdvectedVelocity, x, dT);
			
		urtn[i] = uadv + 0.5f*(u - uradv);
		
		//treba clampat urtn ovdje!
		urtn[i] = clampVelocity(urtn[i], txVelocity, x, dT);
	}
	
	// gl_FragColor = urtn;
	WriteOutput(gl_FragColor, urtn);
}