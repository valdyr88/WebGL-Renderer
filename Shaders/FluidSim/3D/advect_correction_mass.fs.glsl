#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//MacCormack korekcija advekcije mase, (advekcija je napravljena u prethodnom koraku).

precision highp float;
precision highp sampler3D;

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
uniform sampler3D txAdvectedMass; //(r) density ili (rgb) boja i (a) density
uniform sampler3D txVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"
// #define MassResolution

// float zToWorldSpace(int z){ return float(z) * (float(Resolution.z) / float(MassResolution.z)); }
int zToWorldSpace(int z){ return int(float(z) * (float(Resolution.z) / float(MassResolution.z))); }

out_dim advect(sampler3D u, sampler3D m, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return sampleLinear(m, x - dt*v.xyz).out_comp; //sample linear
}

out_dim advectReverse(sampler3D u, sampler3D m, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return sampleLinear(m, x + dt*v.xyz).out_comp; //sample linear
}

vec3 advectPosition(sampler3D u, vec3 x, float dt){
	vec4 v = samplePoint(u, x); //sample point
	return x - dt*v.xyz;
}

void getMinMaxNearestNeighbourValues(sampler3D tx, vec3 x, out out_dim mMin, out out_dim mMax){
	//za 3D treba 8 susjednih samplirat
	vec3 h = vec3(0.5,0.5,0.5);
	x = floor(x + h);
	
	out_dim m[8];
	m[0] = samplePoint(tx, x + vec3(-h.x,-h.y,-h.z)).out_comp;
	m[1] = samplePoint(tx, x + vec3(-h.x,-h.y, h.z)).out_comp;
	m[2] = samplePoint(tx, x + vec3(-h.x, h.y,-h.z)).out_comp;
	m[3] = samplePoint(tx, x + vec3(-h.x, h.y, h.z)).out_comp;
	m[4] = samplePoint(tx, x + vec3( h.x,-h.y,-h.z)).out_comp;
	m[5] = samplePoint(tx, x + vec3( h.x,-h.y, h.z)).out_comp;
	m[6] = samplePoint(tx, x + vec3( h.x, h.y,-h.z)).out_comp;
	m[7] = samplePoint(tx, x + vec3( h.x, h.y, h.z)).out_comp;
	
	mMin = min(min(min(min(min(min(min(m[0],m[1]),m[2]),m[3]),m[4]),m[5]),m[6]),m[7]);
	mMax = max(max(max(max(max(max(max(m[0],m[1]),m[2]),m[3]),m[4]),m[5]),m[6]),m[7]);
}

out_dim clampMass(out_dim m, sampler3D txu, sampler3D txm, vec3 x, float dt){
	vec3 xv = advectPosition(txu, x, dt);
	out_dim mMin, mMax; getMinMaxNearestNeighbourValues(txm, xv, mMin, mMax);
	return max(min(m, mMax), mMin);
}

//===================================================================================================

void main(void)
{
	out_dim mrtn[NUM_OUT_BUFFERS];

	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		vec3 x = toWorldSpace(TexCoords, zToWorldSpace(z+i));
		// mrtn[i] = advect(txVelocity, txMass, x, dT);
		
		out_dim m = samplePoint(txMass, x).out_comp;
		out_dim madv = samplePoint(txAdvectedMass, x).out_comp;
		out_dim mradv = advectReverse(txVelocity, txAdvectedMass, x, dT);
		
		mrtn[i] = madv + 0.5f*(m - mradv);
		
		mrtn[i] = clampMass(mrtn[i], txVelocity, txMass, x, dT);
	}
	
	// gl_FragColor = mrtn;
	WriteOutput(gl_FragColor, mrtn);
}