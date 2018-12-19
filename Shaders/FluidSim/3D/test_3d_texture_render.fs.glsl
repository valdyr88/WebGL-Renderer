#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
//racunanje divergencije, output je scalar

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
	#define textureCube texture
	#define textureCubeLod textureLod
	#define texture2DLod textureLod
#endif

uniform float dT;
uniform float Time;
uniform int z;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

//===================================================================================================

void main(void)
{	
	vec4 color;
	color.x = TexCoords.x;
	color.y = TexCoords.y;
	color.z = 0.0;
	color.a = 1.0;
	
	vec4 colors[NUM_OUT_BUFFERS];
	
	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		colors[i] = color;
		colors[i].z = 1.0 - (float(z+i) / Resolution.z);
		// gl_FragColor[i] = color;
	}
	
	/* gl_FragColor[0] = colors[0];
	gl_FragColor[1] = colors[1];
	gl_FragColor[2] = colors[2];
	gl_FragColor[3] = colors[3];
	gl_FragColor[4] = colors[4];
	gl_FragColor[5] = colors[5];
	gl_FragColor[6] = colors[6];
	gl_FragColor[7] = colors[7]; */
	
	WriteOutput(gl_FragColor, colors);
}
