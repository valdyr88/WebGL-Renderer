#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision mediump float;

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
#endif

#define PI (3.14159265359)

uniform sampler2D txNoiseRGB;
uniform samplerCube txAmbient;
uniform sampler2D txDepth;
uniform sampler2D txBackground;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
uniform vec2 Mouse;
uniform vec2 Resolution;
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

float3 intersectRaySphere(vec3 rPos, vec3 rDir, vec3 sphPos, float sphRad)
{	
	float a = 1.0; 
	vec3 rPos2sphPos = rPos - sphPos;
	float b = 2.0*dot(rDir, rPos2sphPos);
	float c = dot(rPos2sphPos,rPos2sphPos) - sphRad*sphRad;
	float D = b*b - 4.0*a*c;
	
	if(D < 0.0) return vec3(1.0,0.0,1.0);
	if(D == 0.0) return vec3(0.0,0.0,0.0);
	
	float sqrtD = sqrt(D);	
	
	float t1 = (b - sqrtD) / 2.0*a;
	float t2 = (b + sqrtD) / 2.0*a;
	float dt = t2-t1;
	
	return vec3(dt*0.1);
}

float noise(in vec3 x) //3d noise from iq
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = textureLod( txNoiseRGB, (uv+0.5)/256.0, 0.0 ).yx;
	return lerp( rg.x, rg.y, f.z );
}

float sample_clouds(in vec3 p)
{	
	float den = -2.0;//-1.0 - (abs(p.y-0.5)+0.5)/2.0;
	
	float time = 0.05f*Time;
	time = 0.0f;
	
	float f = 0.0;
	vec3 q = p*.5 - vec3(0.0,0.0,1.5)*0.0*time + vec3(sin(0.7*0.0*time),0,0);
    f  = 0.50000*noise( q ); q = q*2.02 - vec3(0.0,2.0,0.0)*time;
    f += 0.25000*noise( q ); q = q*2.03 - vec3(-4.0,0.0,0.1)*time;
    f += 0.12500*noise( q ); q = q*2.01 - vec3(4.0,1.0,0.0)*time;
    f += 0.06250*noise( q ); q = q*2.02 - vec3(0.0,0.0,0.2)*time;
    f += 0.03125*noise( q );
	
	den += 4.0*f;
	den = saturate(den);
	return den;
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
	#define Raymarch_NofSteps 64 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 5
	#define Raymarch_DeltaStep(t) 0.05f*max(1.0,(t/10.0f))*(64.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#elif defined(Quality_Med)
	#define Raymarch_NofSteps 48 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 3
	#define Raymarch_DeltaStep(t) 0.1f*max(1.0,(t/10.0f))*(64.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#elif defined(Quality_Low)
	#define Raymarch_NofSteps 32 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 2
	#define Raymarch_DeltaStep(t) 0.2f*max(1.0,(t/10.0f))*(64.0f / float(Raymarch_NofSteps))
	#define Raymarch_CloudShadow_DeltaStep 0.68f
#endif

//===================================================================================================
// Test raymarch funkcije
//===================================================================================================

vec4 RaymarchSimpleNormal(in vec3 start, in vec3 dir, float t, float treshold)
{	
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		vec3 ray = start + t*dir;
		float dist = sdf_map(ray);
		
		if(abs(dist) <= treshold) break;
		
		t += 0.98*dist;
	}
	
	float t2 = 100.0;
	
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		vec3 ray = start + t2*dir;
		float dist = sdf_map(ray);
		
		if(abs(dist) <= treshold) break;
		
		t2 -= 0.98*dist;
	}
	
	vec3 pos = start + t*dir;
	vec3 normal = calcNormal(pos);
	
	return tovec4(normal, t2-t);
}

float RaymarchSimpleCloudsSample(in vec3 start, in vec3 dir, float t)
{	
	float sum = 0.0;
	
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		vec3 ray = start + t*dir;
		float density = sample_clouds(ray);
		
		sum += density;		
		if(sum > 0.99f*float(Raymarch_NofSteps)) break;
		
		// t += max(0.2, (2.0-density*30.0)*t*0.011);
		t += 0.2;
	}
	
	sum = sum / float(Raymarch_NofSteps); sum *= sum;
	return float(sum);
}

//===================================================================================================
// cloud funkcije
//===================================================================================================
// #define _DEBUG

#ifdef _DEBUG
	// #define _DEBUG_Clouds_StepCount
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
		shadow = shadow - sample_clouds(ray) * shadowMult*shadow;
		s += shadowSampleDelta;
	}
	
	return shadow;
}

vec4 RaymarchCloudsSample(in vec3 start, in vec3 dir, in float t, in float dt, in float tmax)
{
	vec4 colorsum = vec4(0.0);
	/*
	colorsum.xyz - boja
	colorsum.a - density
	*/
	
	#ifdef _DEBUG_Clouds_StepCount
		int StepCount = 0;
	#endif
	
	Light light0 = Lights[0].light;
	#define sampleDelta (dt * (64.0f / float(Raymarch_NofSteps))) //dt == 0.1f
		
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		if(colorsum.a > 0.99f) break;
		
		vec3 ray = start + t*dir;
		vec3 lightDir = light0.position.xyz - ray;
		
		float dens = sample_clouds(ray);
		float shadow = RaymarchCloudShadowSample(ray, normalize(lightDir));
		
		#ifdef _DEBUG_Clouds_StepCount
			StepCount++;
		#endif
		
		float lited = 4.0 / length(lightDir); lited = clamp(lited,0.0,2.0);
		
		vec3 color = lerp( vec3(1.0), cloudColor, dens*0.5);
		color *= lerp( cloudShadowColor, vec3(1.0), shadow);
		color *= lited;
		
		color *= dens;
		
		colorsum.xyz += color*(1.0 - colorsum.a);
		colorsum.a += dens;
		
		t += sampleDelta;
		if(t >= tmax) break;
	}
	
	#ifdef _DEBUG_Clouds_StepCount
		float fStepCount = float(StepCount) / float( (Raymarch_NofSteps) );
		colorsum.rgb = vec3(fStepCount);
	#endif
	
	return colorsum;
}

vec4 RaymarchCloudsSample(in vec3 start, in vec3 dir, in float t){
	return RaymarchCloudsSample(start, dir, t, 0.1f, 100000.0f);
}

/* #if defined(Quality_High)
#elif defined(Quality_Med)
#elif defined(Quality_Low)
#endif */
//===================================================================================================
// RaymarchMulti pronalazi vise tocaka izmedju kojih samplira volumetric clouds
//===================================================================================================
// #define _DEBUG

#ifdef _DEBUG
	// #define _DEBUG_SDF_Density
	// #define _DEBUG_SDF_StepCount
	// #define _DEBUG_SDF_NormalCalcCount
	// #define _DEBUG_SDF_StepCountAndNormalCalcCount
	// #define _DEBUG_SDF_TDistance 1
	// #define _DEBUG_SDF_Display_Normals
#endif

#if defined(Quality_High)
	#define SDF_NofPasses 8 //koliko ima udaljenosti koje ce samplirati (treba biti parni broj, vece vrijednosti dozvoljavaju vise šupljina gizmo containera)
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


vec4 RaymarchMulti(in vec3 start, in vec3 dir, in float tstart, in float dither, in float treshold, in float maxt, in vec3 background)
{
	#ifdef _DEBUG
		int SDF_NofStepsCount = 0;
		int SDF_NofNormalCalcCount = 0;
	#endif
	
//---------------------------------------------------------------------------------
// pronalazak vise udaljenosti T[], oblake ce samplirati izmedju dvije udaljenosti (primjerice izmedju T[0] i T[1], T[2] i T[3]...)
//---------------------------------------------------------------------------------
	float T[SDF_NofPasses];	
	T[0] = tstart; for(int s = 1; s < SDF_NofPasses; ++s) T[s] = -1.0f;
	
	for(int s = 0; s < SDF_NofPasses; ++s)
	{
		float t = T[s]; bool found = false;
		// T[s] = -1.0f;
		
		for(int i = 0; i < SDF_NofStepsPerPass; ++i)
		{
			vec3 ray = start + t*dir;
			float dist = sdf_map(ray);
			#ifdef _DEBUG
				SDF_NofStepsCount++;
			#endif
			
			if(abs(dist) <= treshold){ found = true; break; }
			if((s == 0) && (sign(dist) < 0.0)){ t = 0.0f; found = true; break; }		
			
			if(true && i >= int(0.5f*float(SDF_NofStepsPerPass)))
			{//ovaj dio poveca korak samplanja ako je normala okomita na ray
				vec3 normal = sdf_calc_normal(ray, sdf_map);
				float invdND = (1.0f - abs(dot(normal, dir)));
				t += 100.0f*pow(invdND,16.0)*treshold; 
				
				#ifdef _DEBUG
					SDF_NofNormalCalcCount++;
				#endif
			}
			
			t += max(treshold, 0.99f*abs(dist));
			
			if(t >= maxt) break;
		}
		
		if(t >= maxt) break;
		if(found == false) break;
		if(s < SDF_NofPasses-1) T[s+1] = t+10.0f*max(1.0f,t)*treshold;
		T[s] = t;
	}
	
	#ifdef _DEBUG_SDF_Density
		float tsum = 0.0;
		for(int s = 0; s < SDF_NofPasses/2; ++s)
		{
			float a = T[s*2+1], b = T[s*2];
			if(a < 0.0 || b < 0.0) continue;
			
			tsum += (a - b);
		}
		tsum /= 8.0;
	#endif
	
//---------------------------------------------------------------------------------
	
//---------------------------------------------------------------------------------
// sampliranje cloudsa
//---------------------------------------------------------------------------------
	vec4 colsum	= vec4(0.0); float pointsdens = 0.0;
	for(int s = 0; s < SDF_NofPasses/2; ++s)
	{
		float t = T[s*2], t2 = T[s*2+1]; if(t < 0.0 || t2 < 0.0) break; //nema nista vise;
		float trange = (t2 - t);
		float tstep = trange / float(Raymarch_NofSteps);
				
		colsum = colsum + RaymarchCloudsSample(start, dir, t+dither, max(1.0f,(t/10.0f))*tstep, t2+dither);
		
		if(colsum.a > 0.99f*float(SDF_NofPasses/2)) break;
	}
	colsum = colsum / float(SDF_NofPasses/2);
//---------------------------------------------------------------------------------
	
	#ifndef _DEBUG
		return colsum;
	#else
	
		#ifdef _DEBUG_SDF_Density
			return tovec4(vec3(tsum),1.0);
		#endif
		
		#ifdef _DEBUG_SDF_TDistance
			return tovec4(vec3(T[_DEBUG_SDF_TDistance]/10.0), 1.0);
		#endif
		
		#ifdef _DEBUG_SDF_StepCount
			float fNofStepsCount = float(SDF_NofStepsCount) / float(SDF_NofPasses * SDF_NofStepsPerPass);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
		#ifdef _DEBUG_SDF_NormalCalcCount
			float fNofNormCalcCount = float(4*SDF_NofNormalCalcCount) / float(SDF_NofPasses * SDF_NofStepsPerPass);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofNormCalcCount);
		#endif
		
		#ifdef _DEBUG_SDF_StepCountAndNormalCalcCount
			float fNofStepsCount = float(SDF_NofStepsCount + 4*SDF_NofNormalCalcCount) / float(SDF_NofPasses * SDF_NofStepsPerPass); //4 jer ima 4 samplanja sdf funkcije u normal calc
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
		#ifdef _DEBUG_Clouds_StepCount
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), colsum.r);
		#endif
		
		return vec4(1.0,0.0,1.0,1.0);
		
	#endif
}

vec4 RaymarchMulti2(in vec3 start, in vec3 dir, in float tstart, in float dither, in float treshold, in float maxt, in vec3 background)
{
	#ifdef _DEBUG
		int SDF_NofStepsCount = 0;
		int SDF_NofNormalCalcCount = 0;
	#endif
	#ifdef _DEBUG_Clouds_StepCount
		int StepCount = 0;
	#endif
		
	Light light0 = Lights[0].light;	
	
	float t = tstart;
	vec4 colorsum = vec4(0.0);
	
	for(int s = 0; s < SDF_NofPasses; ++s)
	{
		bool found = false;
		
		//pronalazak sdf nultocke (povrsine sdf containera)
		//---------------------------------------------------------------------------------
		for(int i = 0; i < SDF_NofStepsPerPass; ++i)
		{
			vec3 ray = start + t*dir;
			float dist = sdf_map(ray);
			#ifdef _DEBUG
				SDF_NofStepsCount++;
			#endif
			
			if(abs(dist) <= treshold){ found = true; break; }
			if((sign(dist) < 0.0)){ t = 0.0f; found = true; break; }		
			
			if(true && i >= int(0.5f*float(SDF_NofStepsPerPass)))
			{//ovaj dio poveca korak samplanja ako je normala okomita na ray
				vec3 normal = sdf_calc_normal(ray, sdf_map);
				float invdND = (1.0f - abs(dot(normal, dir)));
				t += 100.0f*pow(invdND,16.0)*treshold; 
				
				#ifdef _DEBUG
					SDF_NofNormalCalcCount++;
				#endif
			}
			
			t += max(treshold, 0.99f*abs(dist));
			
			if(t >= maxt) break;
		}
		//---------------------------------------------------------------------------------
		
		t += 10.0f*max(1.0f,t)*treshold;
		t += dither;
		
		//raytracanje oblaka i provjera sdf predznaka
		//---------------------------------------------------------------------------------				
		for(int i = 0; i < Raymarch_NofSteps; ++i)
		{
			if(colorsum.a > 0.99f) break;
			
			vec3 ray = start + t*dir;
			float dist = sdf_map(ray);
			if(dist > 0.0f) break; //ako je dist pozitivan onda smo izvan sdf containera			
			
			vec3 lightDir = light0.position.xyz - ray;
			
			float dens = sample_clouds(ray);
			float shadow = RaymarchCloudShadowSample(ray, normalize(lightDir));
			
			#ifdef _DEBUG_Clouds_StepCount
				StepCount++;
			#endif
			
			float lited = 4.0 / (sqrt(dot(lightDir,lightDir))); lited = clamp(lited,0.0,4.0);
			// float lited = 1.0f;
			
			vec3 color = lerp( vec3(1.0), cloudColor, dens*0.5);
			color *= lerp( cloudShadowColor, vec3(1.0), shadow);
			color *= lited;
			
			color *= dens;
			
			colorsum.xyz += color*(1.0 - colorsum.a);
			colorsum.a += dens;
			
			float dt = Raymarch_DeltaStep(t);
			
			t += dt;
			if(t >= maxt) break;
		}
		
		if(t >= maxt) break;
		if(colorsum.a > 0.99f*float(SDF_NofPasses/2)) break;
		//---------------------------------------------------------------------------------
	}
	
	colorsum = colorsum / float(SDF_NofPasses/2);
	
	#ifndef _DEBUG
		return colorsum;
	#else
					
		#ifdef _DEBUG_SDF_StepCount
			float fNofStepsCount = float(SDF_NofStepsCount) / float(SDF_NofPasses * SDF_NofStepsPerPass);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
		#ifdef _DEBUG_SDF_NormalCalcCount
			float fNofNormCalcCount = float(4*SDF_NofNormalCalcCount) / float(SDF_NofPasses * SDF_NofStepsPerPass);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofNormCalcCount);
		#endif
		
		#ifdef _DEBUG_SDF_StepCountAndNormalCalcCount
			float fNofStepsCount = float(SDF_NofStepsCount + 4*SDF_NofNormalCalcCount) / float(SDF_NofPasses * SDF_NofStepsPerPass); //4 jer ima 4 samplanja sdf funkcije u normal calc
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
		#ifdef _DEBUG_Clouds_StepCount
			float fStepCount = float(StepCount) / float( (Raymarch_NofSteps) );
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fStepCount);
		#endif
		
		return vec4(1.0,0.0,1.0,1.0);
		
	#endif
	
//---------------------------------------------------------------------------------
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
	float dither = (0.5f+0.5f*rand(TexCoords))*0.125f*(64.0f / float(Raymarch_NofSteps));
	
	vec2 mouse = Mouse.xy / Resolution.xy;
	
	bool bMaliRect = (TexCoords.x < 0.025f && TexCoords.y < 0.025f);
	
	vec4 diffuse = texture2D(txBackground, TexCoords);
	vec3 normal = Normal;
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = normalize(light0.position.xyz - Position);
	vec3 ViewDir = normalize(ViewVector);
	
	vec4 rtn = vec4(0.0);
	
	const float maxT = 30.0f;
	float tstart = RaymarchSDFfindT(Position, ViewDir, 0.95f*sdf_map(Position), 0.1, maxT);
	// if(tstart >= 0.0) maxT = RaymarchSDFfindT(Position, ViewDir, tstart+maxT, 0.1, tstart+100.0);
	
	if(tstart >= 0.0)
		rtn = RaymarchMulti2(Position, ViewDir, 0.0, dither, SDF_PrecisionTreshold, tstart+maxT, diffuse.xyz);
	
	// rtn = RaymarchCloudsSample(Position, ViewDir, dither);
	
	#ifdef _DEBUG_SDF_Display_Normals
		rtn = vec4(0.0);
		if(tstart >= 0.0){
			rtn = RaymarchSimpleNormal(Position, ViewDir, 0.0, 0.001f);
			rtn.xyz = rtn.xyz * 0.5 + 0.5;
		}
	#endif
	
	#if defined(Quality_High)
		if(bMaliRect == true) rtn.xyz = vec3(1.0,0.5,0.0);
	#endif
	#if defined(Quality_Med)
		if(bMaliRect == true) rtn.xyz = vec3(0.0,1.0,0.5);
	#endif
	#if defined(Quality_Low)
		if(bMaliRect == true) rtn.xyz = vec3(0.0,0.5,1.0);
	#endif
	
	gl_FragColor = tovec4(vec3(rtn), 1.0);
}

























