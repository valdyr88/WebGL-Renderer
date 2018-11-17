#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

#global_defines
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

uniform sampler2D InputTexture;
uniform float2 InputTextureDimension;
uniform float2 InvInputTextureDimension;
uniform int CurrentLevel;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;

#define cos_45 0.70710678f
//------------------------------------------------------------------------------

inline vec4 textureLodSaturate(sampler2D tx, float2 t, float l){
	if(t.x < InvInputTextureDimension.x) t.x = InvInputTextureDimension.x;
	if(t.x > 1.0f-InvInputTextureDimension.x) t.x = 1.0f - InvInputTextureDimension.x;
	if(t.y < InvInputTextureDimension.y) t.y = InvInputTextureDimension.y;
	if(t.y > 1.0f-InvInputTextureDimension.y) t.y = 1.0f - InvInputTextureDimension.y;
	return textureLod(tx, t, l);
}

void main(void)
{	
#ifdef USE_HDR_RGBA8
	//mag filtering mora biti NEAREST, jer u protivnom ce lerpati susjedne pixele,
	//no oni se prvo moraju otpakirati iz rgbe (radiance hdr) u rgb.
	vec4 rgbe0 = textureLodSaturate(InputTexture, TexCoords, 0.0);
	
	vec2 d = vec2( InvInputTextureDimension.x, InvInputTextureDimension.y);
	
	vec4 rgbe1 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,0.0),  0.0);
	vec4 rgbe2 = textureLodSaturate(InputTexture, TexCoords+vec2(0.0,d.y),  0.0);
	vec4 rgbe3 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,0.0), 0.0);
	vec4 rgbe4 = textureLodSaturate(InputTexture, TexCoords+vec2(0.0,-d.y), 0.0);
	
	// d = d*cos_45; //mag filtering mora biti NEAREST
	
	vec4 rgbe5 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,d.y),   0.0);
	vec4 rgbe6 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,-d.y),  0.0);
	vec4 rgbe7 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,d.y),  0.0);
	vec4 rgbe8 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,-d.y), 0.0);
	
	vec3 hdr0 = hdr_decode(rgbe0);
	
	vec3 hdr1 = hdr_decode(rgbe1);
	vec3 hdr2 = hdr_decode(rgbe2);
	vec3 hdr3 = hdr_decode(rgbe3);
	vec3 hdr4 = hdr_decode(rgbe4);
	
	vec3 hdr5 = hdr_decode(rgbe5);
	vec3 hdr6 = hdr_decode(rgbe6);
	vec3 hdr7 = hdr_decode(rgbe7);
	vec3 hdr8 = hdr_decode(rgbe8);
	
	vec3 hdr = (hdr0 + hdr1 + hdr2 + hdr3 + hdr4 + hdr5 + hdr6 + hdr7 + hdr8) / 9.0f;
	
	vec4 rgbe = hdr_encode(hdr);
	
	gl_FragColor = rgbe;
#else
	vec4 rgba0 = textureLodSaturate(InputTexture, TexCoords, 0.0);
	
	vec2 d = vec2( InvInputTextureDimension.x, InvInputTextureDimension.y);
	
	vec4 rgba1 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,0.0),  0.0);
	vec4 rgba2 = textureLodSaturate(InputTexture, TexCoords+vec2(0.0,d.y),  0.0);
	vec4 rgba3 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,0.0), 0.0);
	vec4 rgba4 = textureLodSaturate(InputTexture, TexCoords+vec2(0.0,-d.y), 0.0);
	
	d = d*cos_45;
	
	vec4 rgba5 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,d.y),   0.0);
	vec4 rgba6 = textureLodSaturate(InputTexture, TexCoords+vec2(d.x,-d.y),  0.0);
	vec4 rgba7 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,d.y),  0.0);
	vec4 rgba8 = textureLodSaturate(InputTexture, TexCoords+vec2(-d.x,-d.y), 0.0);
	
	vec4 rgba = (rgba0 + rgba1 + rgba2 + rgba3 + rgba4 + rgba5 + rgba6 + rgba7 + rgba8) / 9.0;
	rgba.a = 1.0f;
	
	gl_FragColor = rgba;	
#endif
}
