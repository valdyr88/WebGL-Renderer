#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//racuna pressure

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out float out_FragColor;
	// layout(location = 1) out vec4 out_Normal;
	// layout(location = 2) out vec4 out_AoRSMt;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform vec2 aspect; //odnos dimenzija teksture i svijeta
uniform sampler2D txPressure;
uniform sampler2D txDivergence;
uniform float dT;

#define PressureComp x
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
vec4 samplePoint(sampler2D tx, ivec2 txSize, vec2 x){
	return texelFetch(tx, ivec2(toTexSpace(x)*txSize));
}
vec4 sampleLinear(sampler2D tx, vec2 x){
	return texture2D(tx, toTexSpace(x));
}

//racuna pressure
void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);
	
	ivec2 size = textureSize(txDivergence, 0);
	
	float divu = samplePoint(txDivergence, size, x);
	float p = samplePoint(txPressure, size, x);
	
	const vec2 dx = vec2(1.0,1.0);
	
	float ps[4];
	//za 3D treba 6 susjednih samplirat
	ps[0] = samplePoint(txPressure, size, x + vec2(dx.x, 0.0)).PressureComp;
	ps[1] = samplePoint(txPressure, size, x + vec2(-dx.x,0.0)).PressureComp;
	ps[2] = samplePoint(txPressure, size, x + vec2(0.0, dx.y)).PressureComp;
	ps[3] = samplePoint(txPressure, size, x + vec2(0.0,-dx.y)).PressureComp;
	
	float pnew = p + (divu - (ps[0] + ps[1] + ps[2] + ps[3] - 4.0*p));
	
	out_FragColor = pnew;
}