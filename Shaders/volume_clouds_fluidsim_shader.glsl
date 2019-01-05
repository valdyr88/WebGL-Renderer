#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;
precision mediump sampler3D;

#global_defines
#include "defines"
#include "functions"
#include "sdfunctions"
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
	#define texture2DLod textureLod
	#define texture3DLod textureLod
#endif

uniform sampler2D txNoiseRGB;
uniform samplerCube txAmbient;
uniform sampler2D txDepth;
uniform sampler2D txBackground;
uniform sampler3D txFluidSimVelocity;
uniform sampler3D txFluidSimCloud;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
uniform vec2 Mouse;
uniform vec2 Resolution;
uniform highp vec3 CameraPosition;
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

float sample_clouds(in vec3 p)
{
	return texture3DLod(txFluidSimCloud, p, 0.0).x;
}

//===================================================================================================
// SDF gizmo container (scena)
//===================================================================================================

float sdf_map(in vec3 x)
{
	float dist = 1e10;
	float distA = 1e10;
	float distB = 1e10;
	
	const float scale = 2.0f;

	/* vec3 pos = sdf_position(x, vec3(0.0, 0.0, 0.0));
	dist = sdf_combine( dist, sdf_box(vec3(1.0,0.2,2.0), pos));
	dist = sdf_smooth_union( dist, sdf_cylinder_capped(vec2(0.5,2.0), pos), 0.5 );
		 pos = sdf_position(x, vec3(0.0, 0.0, 1.0));
	dist = sdf_combine( dist, sdf_sphere(0.5, pos)); */
	
	vec3 pos = sdf_position(x/scale, vec3(0.0, 0.0, 0.0));
	
	distA = sdf_combine( distA, sdf_box(vec3(2.0,2.0,2.0), pos));
	distA = sdf_intersect( distA, sdf_sphere(2.75, pos));
	
	distB = sdf_combine( distB, sdf_cylinder_capped(vec2(1.5,3.0), pos));
	distB = sdf_union( distB, sdf_cylinder_capped(vec2(1.5,3.0), pos.yxz));
	distB = sdf_union( distB, sdf_cylinder_capped(vec2(1.5,3.0), pos.xzy));
	
	dist = sdf_subtract( distB, distA );
	
	return distA;
}

//http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
vec3 calcNormal(in vec3 p){
	return sdf_calc_normal(p, sdf_map);
}

#if defined(Quality_High)
	#define Raymarch_NofSteps 256 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 16
	#define Raymarch_DeltaStep(t) (1.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#elif defined(Quality_Med)
	#define Raymarch_NofSteps 192 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 8
	#define Raymarch_DeltaStep(t) (1.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#elif defined(Quality_Low)
	#define Raymarch_NofSteps 128 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 4
	#define Raymarch_DeltaStep(t) (1.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#endif

#if defined(Quality_High)
	#define SDF_NofPasses 8 //koliko ima udaljenosti koje ce samplirati (treba biti parni broj, vece vrijednosti dozvoljavaju vise supljina gizmo containera)
	#define SDF_NofStepsPerPass 128 //br sampliranja sdf mape
	#define SDF_PrecisionTreshold 0.0005f
#elif defined(Quality_Med)
	#define SDF_NofPasses 8
	#define SDF_NofStepsPerPass 64
	#define SDF_PrecisionTreshold 0.005f
#elif defined(Quality_Low)
	#define SDF_NofPasses 8
	#define SDF_NofStepsPerPass 48
	#define SDF_PrecisionTreshold 0.005f
#endif

#define cloudColor (vec3(0.1,0.5,0.4))
#define cloudShadowColor (vec3(0.4,0.47,0.6))
// #define lightDir (normalize(vec3(1.0,0.2,1.0)))

float RaymarchCloudShadowSample(in vec3 start, in vec3 dir)
{
	float s = 0.0f;
	float shadow = 1.0f;
	#define shadowMult (1.0f+(1.5f / float(Raymarch_CloudShadow_NofSteps)))
	#define shadowSampleDelta (Raymarch_CloudShadow_DeltaStep*(1.0f/float(Raymarch_CloudShadow_NofSteps)))

	for(int i = 0; i < Raymarch_CloudShadow_NofSteps; ++i)
	{
		vec3 ray = start + s*dir;
		shadow = saturate(shadow - sample_clouds(ray) * shadowMult*shadow);
		s += shadowSampleDelta;
	}
	
	return shadow;
}

vec4 RaymarchMulti(in vec3 start, in vec3 dir, in float tstart, in float maxt, in float dither)
{
	#ifdef _DEBUG_Clouds_StepCount
		int StepCount = 0;
	#endif
	
	Light light0 = Lights[0].light;	
	
	float t = tstart;
	vec4 colorsum = vec4(0.0);
	
	float dt = (maxt - tstart) / float(Raymarch_NofSteps);
	
	//raytracanje oblaka i provjera sdf predznaka
	//---------------------------------------------------------------------------------				
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		#ifdef _DEBUG_Clouds_StepCount
			StepCount++;
		#endif
		
		vec3 ray = start + t*dir;
		vec3 lightDir = light0.position.xyz - ray;
		
		float dens = sample_clouds(ray);
		float shadow = RaymarchCloudShadowSample(ray, normalize(lightDir));
			
		float lited = 4.0 / ((dot(lightDir,lightDir))); lited = clamp(lited,0.0,4.0);
		// float lited = 1.0f;
		
		vec3 color = lerp( vec3(1.0), cloudColor, dens*0.5);
		color *= lerp( cloudShadowColor, vec3(1.0), shadow);
		color *= lited;
		
		color *= dens;
		
		colorsum.xyz += color*(1.0 - colorsum.a);
		colorsum.a += dens;
		
		// float dt = Raymarch_DeltaStep(t);
		
		t += dt;
		if(t >= maxt) break;
		if(colorsum.a > 0.99f) break;
	}
	
	#ifndef _DEBUG
		return colorsum;
	#else
		#ifdef _DEBUG_Clouds_StepCount
			float fStepCount = float(StepCount) / float( (Raymarch_NofSteps) );
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fStepCount);
		#endif
		
		return vec4(1.0,0.0,1.0,1.0);
	#endif
}
//===================================================================================================

//===================================================================================================
//pronalazi jeli potrebno izvrsavat RaymarchMulti funkciju, i na kojoj udaljenosti gledat za t
//===================================================================================================
#define Raymarch_SDF_Tfind_NofSteps 16

float RaymarchSDFfindT(in vec3 start, in vec3 dir, float t, float disttreshold, float maxt)
{
	for(int i = 0; i < Raymarch_SDF_Tfind_NofSteps; ++i)
	{
		vec3 ray = start + t*dir;
		float dist = sdf_map(ray);
		
		if(abs(dist) <= disttreshold){ return max(t, 0.0); }
		
		t += (dist);
	}
	
	if(t > maxt)
		return -1.0;
		
	return max(t, 0.0);
}
//===================================================================================================

void main(void)
{	
	Light light0 = Lights[0].light;
	float dither = 0.25f*(0.5f+0.5f*rand(TexCoords))*(64.0f/float(Raymarch_NofSteps));
	
	vec2 mouse = Mouse.xy / Resolution.xy;
	
	bool bMaliRect = (TexCoords.x < 0.025f && TexCoords.y < 0.025f);
	
	vec4 diffuse = texture2D(txBackground, TexCoords);
	vec3 normal = Normal;
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = normalize(light0.position.xyz - Position);
	vec3 ViewDir = normalize(ViewVector);
	
	vec4 rtn = vec4(0.0);
	const float maxT = 2.0f;
	float startT = 0.0; //u centru je od 0.0 do 1.0 cloud
	
	// vec3 pos = vec3(0.0,1.0,-7.0);
	vec3 pos = CameraPosition;
	rtn = RaymarchMulti(pos, ViewDir, startT, startT+maxT, dither);
	// rtn.xyz = vec3( sample_clouds(vec3(TexCoords.x,TexCoords.y,fract(Time*0.1))) );
	
	#if defined(Quality_High)
		if(bMaliRect == true) rtn.xyz = vec3(1.0,0.5,0.0);
	#endif
	#if defined(Quality_Med)
		if(bMaliRect == true) rtn.xyz = vec3(0.0,1.0,0.5);
	#endif
	#if defined(Quality_Low)
		if(bMaliRect == true) rtn.xyz = vec3(0.0,0.5,1.0);
	#endif
	
	if(bMaliRect == true) rtn.xyz = vec3(fract(Time*0.1));
	
	// rtn.xyz = vec3(0.1,0.7,1.0);
	gl_FragColor = tovec4(vec3(rtn.xyz), 1.0);
}

























