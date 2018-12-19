#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
precision mediump sampler3D;
//diffuzija zbog viscosity. input je stara brzina, output je nova brzina

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
	#define texture3D texture
	#define textureCube texture
	#define textureCubeLod textureLod
	#define texture2DLod textureLod
	#define texture3DLod textureLod
#endif

uniform int z;
uniform vec3 aspect; //odnos dimenzija teksture i svijeta
uniform float dT;
uniform float Time;
uniform float k; //kinematic viscosity, = viscosity / density
uniform sampler3D txVelocity;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

vec4 velocityFromAdditionalForces(vec3 x, float t, float dt){
	vec3 tc = toTexSpace(x);
		
	if( (tc.x > 0.05 && tc.x < 0.1) && (tc.y > 0.2 && tc.y < 0.8) )
		return tovec4(dt*25.0*vec3(1.0,0.0,0.0), 0.0);
	
	return vec4(0.0,0.0,0.0,0.0);
}

void modifyVelocity(vec3 x, float t, float dt, inout vec4 u){
	// u += velocityFromAdditionalForces(x, t, dt);
	
	vec3 centar = toWorldSpace(vec3(0.2,0.5+cos(0.25*t)*0.25,0.5));
	if(length(x - centar) < 14.0) u = 256.0*dt*vec4(0.0,-sin(0.25*t),0.0,0.0);
	// if(length(x - centar) < 10.0) u = vec4(0.0,0.0,0.0,0.0);
}

//racuna diffuziju zbog viscosity
void main(void)
{	
	float dt = dT;	
	const vec3 dx = vec3(1.0,1.0,1.0);
	vec4 unew[NUM_OUT_BUFFERS];
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{
		vec3 x = toWorldSpace(TexCoords, z+i);
		vec4 u = samplePoint(txVelocity, x);
			
		vec4 us[6];
		//za 3D treba 6 susjednih samplirat
		us[0] = samplePoint(txVelocity, x + vec3( dx.x,0.0,0.0));
		us[1] = samplePoint(txVelocity, x + vec3(-dx.x,0.0,0.0));
		us[2] = samplePoint(txVelocity, x + vec3(0.0, dx.y,0.0));
		us[3] = samplePoint(txVelocity, x + vec3(0.0,-dx.y,0.0));
		us[4] = samplePoint(txVelocity, x + vec3(0.0,0.0, dx.z));
		us[5] = samplePoint(txVelocity, x + vec3(0.0,0.0,-dx.z));
		
		unew[i] = u + dt*k*(us[0] + us[1] + us[2] + us[3] + us[4] + us[5] - 6.0*u);
		
		//dodatne sile
		modifyVelocity(x, Time, dT, unew[i]);
	}
	
	// gl_FragColor = unew;
	WriteOutput(gl_FragColor, unew);
}