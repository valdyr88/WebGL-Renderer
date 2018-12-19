#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//display raznih fluidsim vrijednosti

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

uniform vec3 aspect; //odnos dimenzija teksture i svijeta
uniform float dT;
uniform float k; //kinematic viscosity, = viscosity / density
uniform float displayBrightness;

// uniform sampler2D txAdvectedVelocity;
uniform sampler2D txVelocity;
uniform sampler2D txPressure;
uniform sampler2D txVelocityDivergence;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"

/* 
	#define _DEBUG_Display_Velocity
	#define _DEBUG_Display_VelocitySize
	#define _DEBUG_Display_Pressure
	#define _DEBUG_Display_Divergence
*/

void main(void)
{	
	int z = 0;
	ivec2 size = textureSize(txVelocity, 0);
	vec3 x = toWorldSpace(TexCoords, z);
	float dt = dT;	
	const vec3 dx = vec3(1.0,1.0,1.0);
	
	vec4 rtn = vec4(0.0,0.0,0.0,1.0);
	
	#if defined(_DEBUG_Display_Velocity)	
		vec4 v = texture2D(txVelocity, TexCoords);
		rtn.xyz = (displayBrightness*v.xyz)*0.5f + 0.5f;
		
	#elif defined(_DEBUG_Display_VelocitySize)	
		vec4 v = texture2D(txVelocity, TexCoords);
		rtn.xyz = vec3(displayBrightness*length(v.xyz));
		
	#elif defined(_DEBUG_Display_Pressure)
		float p = texture2D(txPressure, TexCoords).x;
		rtn.xyz = vec3((displayBrightness*p*0.5+0.5));
		
	#elif defined(_DEBUG_Display_Divergence)
		float div = texture2D(txVelocityDivergence, TexCoords).x;
		rtn.xyz = vec3((displayBrightness*div*0.5+0.5));
		
	#endif
	
	rtn.xyz += 0.01275f*vec3(rand(TexCoords.xy));
	
	rtn.a = 1.0;
	// if(isAtBorder(x) == true) rtn.xyz = vec3(1.0,0.0,1.0);
	
	out_FragColor = rtn;
}







