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

#define SUNLIGHT_PROPAGATION 0.50
#define AtmosphereDensity (1.0)

void main(void)
{	
	Light light0 = Lights[0].light;

	vec3 normal = Normal;
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = (Light_getLightType(light0) == LightType_Direction)? normalize(light0.position.xyz) : normalize(light0.position.xyz - Position);
	// vec3 toLight = normalize(vec3(0.2,1.0,1.0));
	
	float dVN = dot(normal,toCamera);
	float dLN = dot(normal,toLight);
	
	vec4 atmosphereColor = texture2D(txAtmosphereGradient, vec2(0.5f, 1.0f-0.99f*saturate(dLN + SUNLIGHT_PROPAGATION)));
	
	float altitudeFade = saturate(6.0*dVN);
	altitudeFade = altitudeFade*(1.0 - saturate(AtmosphereDensity*dVN) - saturate((-dLN + SUNLIGHT_PROPAGATION))) * atmosphereColor.a;
	altitudeFade *= altitudeFade*altitudeFade*altitudeFade;
	
	vec4 outval = atmosphereColor;
	outval.a = altitudeFade * float(dLN > -0.2);
	
	// outval.xyz = vec3(dLN*(1.0-sqrt(dVN)));
	// outval.a = 0.0f;
	// outval.xyz = vec3(dLN > -0.2);
	// outval.xyz = vec3(dLN);
	
	// #ifdef USE_HDR_RGBA8
		// gl_FragColor = hdr_encode(outval.xyz);
	// #else
		gl_FragColor = outval;
	// #endif
}
