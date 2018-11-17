#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#include "functions"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor glFragColor
	out vec4 glFragColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
uniform samplerCube txAmbient;

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

void main(void)
{
	// vec4 diffuse = texture2D(txDiffuse, TexCoords);
	
	mat3 NormalMatrix = CreateRotationMatrix(Tangent, Bitangent, Normal);
	// if(uFlags == 1) normaltx.y = 1.0-normaltx.y;
	// if(uint_getbit(uFlags, 2) == true) normaltx.y = 1.0-normaltx.y;
	// if(getBitFlag(2) == true) normaltx.y = 1.0-normaltx.y;
	
	vec4 Amb = textureCube(txAmbient, -Normal.xyz);
	
	// gl_FragColor = vec4( I*I, l, I, 1.0);
	// gl_FragColor = vec4( l, l, l, 1.0);
	// gl_FragColor = vec4( (Position.xyz / 8.0) + 0.5, 1.0 );
	// gl_FragColor = vec4(dir*0.5 + 0.5, 1.0);
	// l = dot(Normal.xyz,dir);
	// gl_FragColor = vec4(l, l, l, 1.0);
	// if(dot(Position.xyz,Position.xyz) < pow(0.02,2.0)) gl_FragColor = vec4(0.0,0.0,0.0,1.0);
	// 
	// gl_FragColor.xyz = normal.xyz*0.5+0.5; gl_FragColor.a = 1.0;
	// gl_FragColor = vec4(Normal.xyz*0.5+0.5, 1.0);
	// gl_FragColor = vec4(TexCoords.xy, 0.0, 1.0);
		
	float4 rgbe = hdr_encode(Amb.xyz);
	
	gl_FragColor = Amb;
	gl_FragColor.a = 1.0;
	
	// gl_FragColor = rgbe / 255.0f;
}
