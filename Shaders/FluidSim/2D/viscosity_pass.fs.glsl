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
	#define texture2DLod textureLod
#endif

uniform vec2 aspect; //odnos dimenzija teksture i svijeta
uniform float dT;
uniform float Time;
uniform float k; //kinematic viscosity, = viscosity / density
uniform sampler2D txVelocity;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

vec4 velocityFromAdditionalForces(vec2 x, float t, float dt){
	vec2 tc = toTexSpace(x);
		
	if( (tc.x > 0.05 && tc.x < 0.1) && (tc.y > 0.2 && tc.y < 0.8) )
		return tovec4(dt*25.0*vec3(1.0,0.0,0.0), 0.0);
	
	return vec4(0.0,0.0,0.0,0.0);
}

void modifyVelocity(vec2 x, float t, float dt, inout vec4 u){
	// u += velocityFromAdditionalForces(x, t, dt);
	
	vec2 centar = toWorldSpace(vec2(0.2,0.5+cos(0.7*t)*0.25));
	if(length(x - centar) < 14.0) u = 2048.0*dt*vec4(0.0,-sin(0.7*t),0.0,0.0);
	// if(length(x - centar) < 10.0) u = vec4(0.0,0.0,0.0,0.0);
}

//racuna diffuziju zbog viscosity
void main(void)
{	
	vec2 x = toWorldSpace(TexCoords);
	float dt = dT;	
	const vec2 dx = vec2(1.0,1.0);
	
	vec4 u = samplePoint(txVelocity, x);
		
	vec4 us[4];
	//za 3D treba 6 susjednih samplirat
	us[0] = samplePoint(txVelocity, x + vec2( dx.x,0.0));
	us[1] = samplePoint(txVelocity, x + vec2(-dx.x,0.0));
	us[2] = samplePoint(txVelocity, x + vec2(0.0, dx.y));
	us[3] = samplePoint(txVelocity, x + vec2(0.0,-dx.y));
	
	vec4 unew = u + dt*k*(us[0] + us[1] + us[2] + us[3] - 4.0*u);
	
	//dodatne sile
	modifyVelocity(x, Time, dT, unew);
			
	gl_FragColor = unew;
}