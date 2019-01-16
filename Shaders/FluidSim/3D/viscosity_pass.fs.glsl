#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;
precision highp sampler3D;
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
uniform vec4 sphereBarrier; //xyz pozicija, w radius
uniform vec3 sphereBarrierVelocity;
// #define sphereBarrier (vec4(  0.5,0.5+cos(0.25*t)*0.25,0.5,  0.05f))
// #define sphereBarrierVelocity ( 128.0*vec3(0.0,-sin(0.25*t),0.0) )
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

vec4 velocityFromAdditionalForces(in vec4 u, in vec3 x, in float t, in float dt){
	vec3 tc = toTexSpace(x);
		
	if( (tc.x > 0.05 && tc.x < 0.1) && (tc.y > 0.2 && tc.y < 0.8) )
		return u + tovec4(dt*25.0*vec3(1.0,0.0,0.0), 0.0);
	
	return u;
}

vec4 velocityFromSphereBarrier(in vec4 u, in vec3 x, in float t, in float dt){
	
	vec3 centar = toWorldSpace(sphereBarrier.xyz);
	vec3 toX = x - centar;
	
	if(length(toX) < 0.8f*sphereBarrier.w*Resolution.x){
		return vec4(0.0);
	}
	if(length(toX) < 1.4f*sphereBarrier.w*Resolution.x){
		//saturate(dot(normal(x-centar),normal(velocity))) * normal(x-centar) * length(velocity)
		
		vec3 n = normalize(toX);
		vec3 vdir = normalize(sphereBarrierVelocity);
		float vsize = length(sphereBarrierVelocity);
		float dotNV = dot(n,vdir)*0.9+0.1;
		
		// if(dotNV > 0.0) //ocekivo sam da ce pressure pass forsat da brzina iza kugle bude istog smijera kao i ispred no nije tako.
			return u + dt*8.0*(dotNV)*vsize*tovec4(Resolution.xyz*n, 0.0);
	}
	
	return u;
}

void modifyVelocity(vec3 x, float t, float dt, inout vec4 u){
	// u = velocityFromAdditionalForces(u, x, t, dt);
	
	/* vec3 centar = toWorldSpace(sphereBarrier.xyz);
	if(length(x - centar) < 1.4f*sphereBarrier.w*Resolution.x) u = dt*tovec4(sphereBarrierVelocity,0.0);
	if(length(x - centar) < 0.8f*sphereBarrier.w*Resolution.x) u = vec4(0.0,0.0,0.0,0.0); */
	
	u = velocityFromSphereBarrier(u, x, t, dt);
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
				
		unew[i] = u + dt*k*(laplace(u, txVelocity, x, dx));
		
		//dodatne sile
		modifyVelocity(x, Time, dT, unew[i]);
	}
	
	// gl_FragColor = unew;
	WriteOutput(gl_FragColor, unew);
}