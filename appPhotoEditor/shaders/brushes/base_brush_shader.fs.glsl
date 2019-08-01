#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;

#include "defines"
#include "functions"
#include "structs"
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

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;

//------------------------------------------------------------------------------
#include "ubBrush"
#include "splines"

mat4x3 P =  ( 
			mat4x3( 0.0, 0.0, 0.0,
					0.5, 0.2, 0.0,
					0.2, 0.7, 0.0,
					1.0, 1.0, 0.0 ) );

bool isControlPoint( vec2 uv, mat4x3 mP, float size ){
	vec4 dists = vec4(  distance( uv, mP[0].xy ),
						distance( uv, mP[1].xy ),
						distance( uv, mP[2].xy ),
						distance( uv, mP[3].xy ) );
	bool4 bIsControlPoint = bool4(  float_equals( dists.x, 0.0, size ),
									float_equals( dists.y, 0.0, size ),
									float_equals( dists.z, 0.0, size ),
									float_equals( dists.w, 0.0, size ) );
	return bIsControlPoint.x || bIsControlPoint.y || bIsControlPoint.z || bIsControlPoint.w;
}

void old_main(void)
{	
	float4 dither = 0.0275f*(randf4(TexCoords+vec2(sBrush_getRandom(), 1.0-sBrush_getRandom())));
	
	vec4 old = texture2D(txDiffuse, TexCoords);
			
	float dT = sBrush_getdTime();
	vec2 toPos = sBrush_getPosition().xy - TexCoords.xy;
	float distToPos = length(toPos) * 500.0f;
	float invDistToPos = 1.0f / max(0.01f, distToPos);
	invDistToPos = saturate(invDistToPos-0.01f);
	
	vec4 add = (vec4(10.0)+150.0*dither)*dT*invDistToPos*sBrush_getColor();
	
	float t = fract(Time/10.0);
	
	t = getClosestPointAlongLine(TexCoords.xy, P[1].xy, P[2].xy - P[1].xy) / 4.0 + 0.25;
	
	vec3 p = ibezier_curve(t, P);
	
	mat4x3 a = ibezier_curve_getAmatrix(P);
	
	float dist = distance(p.xy, TexCoords.xy);
	float I = float(float_equals(dist, 0.0, 0.01));
	
	if(sBrush_isPressed() == true){
		gl_FragColor = old + add; }
	else {
		gl_FragColor = old; }
	// gl_FragColor.a = length(glFragColor.xyz);
	
	/*float l = distancePointLine(TexCoords.xy, P[2].xy, P[3].xy);
	l = min(l, distancePointLine(TexCoords.xy, P[0].xy, P[1].xy));
	l = min(l, distancePointLine(TexCoords.xy, P[1].xy, P[2].xy));*/
	
	gl_FragColor.xy = vec2(I);
	
	if(isControlPoint(TexCoords, P, 0.01))
		gl_FragColor.z = 1.0;
	else
		gl_FragColor.z = 0.0;	
	gl_FragColor.a = 1.0;
}

void main(void)
{
	float4 dither = 0.0275f*(randf4(TexCoords+vec2(sBrush_getRandom(), 1.0-sBrush_getRandom())));
	
	vec4 old = texture2D(txDiffuse, TexCoords);
			
	float dT = sBrush_getdTime();
	vec2 toPos = sBrush_getPosition().xy - TexCoords.xy;
	float distToPos = length(toPos) * 500.0f;
	float invDistToPos = 1.0f / max(0.01f, distToPos);
	invDistToPos = saturate(invDistToPos-0.01f);
	
	vec4 add = (vec4(10.0)+150.0*dither)*dT*invDistToPos*sBrush_getColor();
		
	if(sBrush_isPressed() == true){
		gl_FragColor = old + add; }
	else {
		gl_FragColor = old; }
	gl_FragColor.a = 1.0;
}
