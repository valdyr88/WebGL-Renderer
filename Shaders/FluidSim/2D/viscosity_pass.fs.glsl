#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//diffuzija zbog viscosity. input je stara brzina, output je nova brzina

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
uniform float dT;
uniform float k; //kinematic viscosity, = viscosity / density
uniform sampler2D txVelocity;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

vec2 toTexSpace(vec2 x){ return x*aspect; }
vec2 toWorldSpace(vec2 x){ return x/aspect; }

vec4 samplePoint(sampler2D tx, vec2 x){
	ivec2 txSize = textureSize(tx, 0);
	return texelFetch(tx, ivec2(toTexSpace(x)*vec2(txSize)),0); //sample point
}
vec4 samplePoint(sampler2D tx, ivec2 txSize, vec2 x){
	return texelFetch(tx, ivec2(toTexSpace(x)*vec2(txSize)),0);
}
vec4 sampleLinear(sampler2D tx, vec2 x){
	return texture2D(tx, toTexSpace(x));
}

//racuna diffuziju zbog viscosity
void main(void)
{	
	ivec2 size = textureSize(txVelocity, 0);
	vec2 x = toWorldSpace(TexCoords);
	float dt = dT;	
	const vec2 dx = vec2(1.0,1.0);
	
	vec4 u = samplePoint(txVelocity, size, x);	
	
	vec4 us[4];
	//za 3D treba 6 susjednih samplirat
	us[0] = samplePoint(txVelocity, size, x + vec2(dx.x, 0.0));
	us[1] = samplePoint(txVelocity, size, x + vec2(-dx.x,0.0));
	us[2] = samplePoint(txVelocity, size, x + vec2(0.0, dx.y));
	us[3] = samplePoint(txVelocity, size, x + vec2(0.0,-dx.y));
	
	vec4 unew = u + dt*k*(us[0] + us[1] + us[2] + us[3] - 4.0*u);
	
	out_FragColor = unew;
}