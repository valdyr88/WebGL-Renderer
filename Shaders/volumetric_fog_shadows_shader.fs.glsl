#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;

#global_defines
#include "defines"
#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out float out_FragColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txDepth;

uniform mat4 InverseViewProjectionMatrix;
uniform vec4 center;

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
#define Nof_Samples 100u

void main(void)
{
	float depth = texture2D(txDepth, vec2(TexCoords.x, 1.0f-TexCoords.y) ).x;
	depth = LinearizeDepth(depth, 0.1, 1000.0);
	// gl_FragColor = depth*depth*depth*depth;
	
	// const vec2 center = vec2(0.5);
	const float dt = 0.004f;
	vec2 t = vec2(TexCoords.x, 1.0f-TexCoords.y);
	vec2 dir = ((center.w < 0.0f)? -1.0f : 1.0f) *normalize((0.5f*center.xy+0.5f)-t);
	
	float shade = 0.0f;
	
	for(uint i = 0u; i < Nof_Samples; ++i){
		float sdepth = texture2D(txDepth, t + dt*float(i)*dir ).x;
		sdepth = LinearizeDepth(sdepth, 0.1, 1000.0);
		
		//shade *= saturate( saturate(1.0f - (depth-sdepth)/10.0f) + 0.1f*(float(i)/float(Nof_Samples)) );
		float depthdiff = saturate(depth-sdepth - (float(i)/float(Nof_Samples)));
		shade += pow(8.0f*depthdiff, 2.0f);
		
		if(sdepth < depth)
			depth = sdepth;
	}
	shade /= float(Nof_Samples);
	shade = 1.0f-shade;
	shade = pow(shade,4.0f);
	
	float dist = length(((0.5f*center.xy+0.5f)-t));
	if(dist < 0.025f) shade = 0.0f;
	
	gl_FragColor = shade;
}
