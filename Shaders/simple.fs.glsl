#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
/***/
#include "defines"
#include "functions"
#include "structs"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
// uniform samplerCube txAmbient;

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

void main(void)
{
	Light light0 = Lights[0].light;
	
	gl_FragColor = vec4(Normal.xyz*0.5+0.5, 1.0);
	// Light light = CreateLight(vec3(0.0, 0.0, 10.0), 20.0);
	float I = Light_Calculate(light0, Position);
	
	vec4 diffuse = texture2D(txDiffuse, TexCoords);
	vec4 normaltx = texture2D(txNormal, TexCoords);
	vec4 AoRS = texture2D(txAoRS, TexCoords);
	
	mat3 NormalMatrix = CreateRotationMatrix(Tangent, Bitangent, Normal);
	
	// if(uFlags == 1) normaltx.y = 1.0-normaltx.y;
	// if(uint_getbit(uFlags, 2) == true) normaltx.y = 1.0-normaltx.y;
	// if(getBitFlag(2) == true) normaltx.y = 1.0-normaltx.y;
	vec3 normal = normaltx.xyz*2.0 - 1.0;
	normal = NormalMatrix * normal; normal = normalize(normal);
	vec3 dirToLight = Light_DirToLight(light0, Position);	
	
	float l = dot(normal.xyz, dirToLight);
	l = l*0.5+0.5;
	
	float mipLevel = (cos(Time*0.4)+1.0)/2.0;
	// vec4 Amb = textureCubeLod(txAmbient, -normal.xyz, 7.0*AoRS.y);
	float ambMult = 2.0*(cos(Time*0.4) + 1.0)+0.75;
	
	gl_FragColor.xyz = vec3(1.0)*saturate(l);
	gl_FragColor.xyz = vec3(1.0) * I * l;
	
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
	
	gl_FragColor.a = 1.0;
}
