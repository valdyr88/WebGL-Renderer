#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
#include "defines"
#include "functions"
#include "structs"
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

// #define PI (3.14159265359)

uniform sampler2D txAtmosphereGradient;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
//------------------------------------------------------------------------------
#define varyin in

varyin vec3 Normal;
varyin vec3 Tangent;
varyin vec3 Bitangent;
varyin vec3 PixelPosition;
varyin vec2 TexCoords;
varyin vec3 Position;
varyin vec3 ViewVector;

//------------------------------------------------------------------------------
// uniform Light light0;
#include "ubLight"

#define SUNLIGHT_PROPAGATION 0.075f
#define AtmosphereDensity (0.8f)

void main(void)
{
	float alpha = 1.0f;
	Light light0 = Lights[0].light;
	// light0.position.xyz = vec3(-1.0f,0.0f,1.0f);
	
	vec3 normal = normalize(Normal);
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = (Light_getLightType(light0) == LightType_Direction)? normalize(light0.position.xyz) : normalize(light0.position.xyz - Position);
	// vec3 toLight = normalize(vec3(0.2f,1.0f,1.0f));
	
	float dVN = dot(normal,toCamera);
	float dLN = dot(normal,toLight);
	float f = fresnel(0.5f, dVN).x;
	
	float altitudeFade = pow(saturate(8.0f*dVN-0.4f),3.0f);
	
	float sdLN = saturate(dLN + SUNLIGHT_PROPAGATION + f), sdVN = saturate(dVN);
	float aimedf = saturate( 1.75f*(1.0f-1.0f*sqrt(sdVN))*(sdLN) );
	alpha = pow( aimedf, 1.0f );
	
	gl_FragColor = vec4(vec3(altitudeFade*alpha),1.0f);
	// return;
	
	vec4 atmosphereColor = gamma(texture2D(txAtmosphereGradient, vec2(0.5f, 1.0f-0.99f*saturate(sdLN))), 2.2f);
	gl_FragColor = pow(atmosphereColor, vec4(1.25f-pow(altitudeFade,4.0f)));
	gl_FragColor.a = alpha*altitudeFade*(1.75f*(1.0f-1.0f*sqrt(sdVN)));
	gl_FragColor.xyz *= saturate(alpha);
	
	// gl_FragColor = vec4(vec3(dVN),1.0f);
	// gl_FragColor = vec4(0.0f);
}

void main_old(void)
{	
	Light light0 = Lights[0].light;
	// light0.position.xyz = vec3(-1.0f,0.0f,1.0f);
	
	vec3 normal = normalize(Normal);
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = (Light_getLightType(light0) == LightType_Direction)? normalize(light0.position.xyz) : normalize(light0.position.xyz - Position);
	// vec3 toLight = normalize(vec3(0.2f,1.0f,1.0f));
	
	float dVN = dot(normal,toCamera);
	float dLN = dot(normal,toLight);
	
	vec4 atmosphereColor = texture2D(txAtmosphereGradient, vec2(0.5f, 1.0f-0.99f*saturate(dLN + SUNLIGHT_PROPAGATION)));
	
	float altitudeFade = saturate(16.0f*dVN-1.5f);
	float litFade = saturate(1.0f - saturate(AtmosphereDensity*dVN) - saturate((-dLN + SUNLIGHT_PROPAGATION))) * atmosphereColor.a;
	// float litFade = saturate( ((1.0f-saturate(AtmosphereDensity*dVN)) - (-dLN+dVN - SUNLIGHT_PROPAGATION + 0.5f)) ) * atmosphereColor.a;
	float fade = altitudeFade * litFade;
	fade *= fade*fade*fade*fade;
	
	vec4 outval = pow(atmosphereColor,vec4(1.0f)) * fade * float(dLN > -0.2f);
	
	// outval.xyz = vec3(dLN*(1.0f-sqrt(dVN)));
	// outval.a = 0.0f;
	// outval.xyz = vec3(dLN > -0.2f);
	// outval.xyz = vec3(dLN);
	
	// #ifdef USE_HDR_RGBA8
		// gl_FragColor = hdr_encode(outval.xyz);
	// #else
		gl_FragColor = outval;
	// #endif
		
	float alpha = 1.0f;
	alpha = (1.0f-dVN)*dLN;
	alpha = (1.0f-dVN)*(dLN-dVN);
	alpha = fade;
	
	gl_FragColor = vec4(vec3(alpha),1.0f);
}
