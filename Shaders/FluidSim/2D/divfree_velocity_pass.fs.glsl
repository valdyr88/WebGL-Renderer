#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//racuna divergence free velocity, output je velocity

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
uniform sampler2D txPressure;
uniform sampler2D txVelocity;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim2d_include"

#define GradComp x
vec4 gradient(sampler2D tx, vec2 x){
	ivec2 size = textureSize(tx, 0);
	
	const vec2 dx = vec2(1.0,1.0);
	
	float u[4];
	//za 3D treba 6 susjednih samplirat
	u[0] = samplePoint(tx, size, x + vec2(dx.x, 0.0)).GradComp;
	u[1] = samplePoint(tx, size, x + vec2(-dx.x,0.0)).GradComp;
	u[2] = samplePoint(tx, size, x + vec2(0.0, dx.y)).GradComp;
	u[3] = samplePoint(tx, size, x + vec2(0.0,-dx.y)).GradComp;
	
	vec4 grad = 0.5*vec4( u[0]-u[1], u[2]-u[3], 0.0, 0.0 );
	return grad;
}

//racuna divergence free brzinu
void main(void)
{
	vec2 x = toWorldSpace(TexCoords);
	
	ivec2 size = textureSize(txPressure, 0);
	
	vec4 gradP = gradient(txPressure, x);
	vec4 oldU = samplePoint(txVelocity, x);
	
	vec4 u = oldU - gradP;
	
	if(isAtBorder(x)) u = oldU;
	
	gl_FragColor = u;
	gl_FragColor.a = 1.0;
}