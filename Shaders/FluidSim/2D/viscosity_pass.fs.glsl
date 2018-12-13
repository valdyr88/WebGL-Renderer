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
	// vec2 tc = toTexSpace(x);
	vec2 tc = TexCoords;
	
	/* if( (tc.x > 0.1 && tc.x < 0.2) && (tc.y > 0.4 && tc.y < 0.6) ){
		return tovec4(dt*50.0*vec3(sin(t), cos(t), 0.2), 1.0);
	} */
	
	tc.y -= 0.25*cos(t)+0.5;
		
	if( (tc.x > 0.0 && tc.x < 0.05) && (tc.y > 0.2 && tc.y < 0.4) )
		return tovec4(dt*1.0*vec3(1.0,0.0,0.0), 1.0);
	
	return vec4(0.0,0.0,0.0,1.0);
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
	us[0] = samplePoint(txVelocity, size, x + vec2( dx.x,0.0));
	us[1] = samplePoint(txVelocity, size, x + vec2(-dx.x,0.0));
	us[2] = samplePoint(txVelocity, size, x + vec2(0.0, dx.y));
	us[3] = samplePoint(txVelocity, size, x + vec2(0.0,-dx.y));
	
	vec4 unew = u + dt*k*(us[0] + us[1] + us[2] + us[3] - 4.0*u);
	// vec4 unew = u;
	
	//dodatne sile
	unew += velocityFromAdditionalForces(x, Time, dT);
	//
	if(isAtBorder(x)) unew = vec4(0.0,0.0,0.0,0.0);
	
	gl_FragColor = unew;
	gl_FragColor.a = 1.0;
}