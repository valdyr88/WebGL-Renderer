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
	float den = -1.0 - (abs(p.y-0.5)+0.5)/2.0;
	
	float time = 0.05*Time;
	
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
	/* const float h = 1e-4;
	const vec2 k = vec2(1.0,-1.0);
	return normalize( k.xyy * sdf_map( p + k.xyy*h ) +
					  k.yyx * sdf_map( p + k.yyx*h ) +
					  k.yxy * sdf_map( p + k.yxy*h ) +
					  k.xxx * sdf_map( p + k.xxx*h ) ); */
	return sdf_calc_normal(p, sdf_map);
}


//===================================================================================================
// Test raymarch funkcije
//===================================================================================================
#if defined(Quality_High)
	#define Raymarch_NofSteps 64 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 5
#elif defined(Quality_Med)
	#define Raymarch_NofSteps 32 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 3
#elif defined(Quality_Low)
	#define Raymarch_NofSteps 24 //broj samplanja npr za cloudse
	#define Raymarch_CloudShadow_NofSteps 2
#endif

vec4 raymarchSimpleNormal(in vec3 start, in vec3 dir, float t, float treshold)
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

float raymarchSimpleCloudsSample(in vec3 start, in vec3 dir, float t)
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

#define cloudColor (vec3(0.1,0.5,0.4))
#define cloudShadowColor (vec3(0.4,0.47,0.6))
// #define lightDir (normalize(vec3(1.0,0.2,1.0)))

float raymarchCloudShadowSample(in vec3 start, in vec3 dir)
{
	float s = 0.0f;
	float shadow = 1.0f;
	#define shadowMult (1.0f+(1.5f / float(Raymarch_CloudShadow_NofSteps)))
	#define shadowSampleDelta (0.68f*(1.0f/float(Raymarch_CloudShadow_NofSteps)))

	for(int i = 0; i < Raymarch_CloudShadow_NofSteps; ++i)
	{
		vec3 ray = start + s*dir;
		shadow = shadow - sample_clouds(ray) * shadowMult*shadow;
		s += shadowSampleDelta;
	}
	
	return shadow;
}

vec4 raymarchCloudsSample(in vec3 start, in vec3 dir, in float t, in float dt, in float tmax)
{
	vec4 colorsum = vec4(0.0);
	/*
	colorsum.xyz - boja
	colorsum.a - density
	*/
		
	Light light0 = Lights[0].light;
	#define lightDir ((light0.position.xyz - ray))	
	#define sampleDelta (dt * (64.0f / float(Raymarch_NofSteps))) //dt == 0.1f
	
	for(int i = 0; i < Raymarch_NofSteps; ++i)
	{
		if(colorsum.a > 0.99f) break;
		
		vec3 ray = start + t*dir;
		float dens = sample_clouds(ray);
		float shadow = raymarchCloudShadowSample(ray, normalize(lightDir));
		
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
	
	return colorsum;
}
vec4 raymarchCloudsSample(in vec3 start, in vec3 dir, in float t){
	return raymarchCloudsSample(start, dir, t, 0.1f, 100000.0f);
}

/* #if defined(Quality_High)
#elif defined(Quality_Med)
#elif defined(Quality_Low)
#endif */
//===================================================================================================
// raymarchMulti pronalazi vise tocaka izmedju kojih samplira volumetric clouds
//===================================================================================================
#define _DEBUG
// #define _DEBUG_SDF_Density
// #define _DEBUG_SDF_StepCount
// #define _DEBUG_SDF_NormalCalcCount
#define _DEBUG_SDF_StepCountAndNormalCalcCount

#if defined(Quality_High)
	#define Raymarch_NofSDFPasses 8 //koliko ima udaljenosti koje ce samplirati (treba biti parni broj, vece vrijednosti dozvoljavaju vise šupljina gizmo containera)
	#define Raymarch_SDFPass_NofSteps 128 //br sampliranja sdf mape
#elif defined(Quality_Med)
	#define Raymarch_NofSDFPasses 8
	#define Raymarch_SDFPass_NofSteps 64
#elif defined(Quality_Low)
	#define Raymarch_NofSDFPasses 8
	#define Raymarch_SDFPass_NofSteps 32
#endif

float T[Raymarch_NofSDFPasses];

vec4 raymarchMulti(in vec3 start, in vec3 dir, float tstart, float dither, float treshold, in vec3 background)
{
	#ifdef _DEBUG
		int SDF_NofStepsCount = 0;
		int SDF_NofNormalCalcCount = 0;
	#endif
	
//---------------------------------------------------------------------------------
// pronalazak vise udaljenosti T[], oblake ce samplirati izmedju dvije udaljenosti (primjerice izmedju T[0] i T[1], T[2] i T[3]...)
//---------------------------------------------------------------------------------
	// float T[Raymarch_NofSDFPasses];
	T[0] = tstart; for(int s = 1; s < Raymarch_NofSDFPasses; ++s) T[s] = -1.0;
	
	for(int s = 0; s < Raymarch_NofSDFPasses; ++s)
	{
		float t = T[s]; bool found = false;
		
		for(int i = 0; i < Raymarch_SDFPass_NofSteps; ++i)
		{
			vec3 ray = start + t*dir;
			float dist = sdf_map(ray);
			
			#ifdef _DEBUG
				SDF_NofStepsCount++;
			#endif
			
			if(abs(dist) <= treshold){ found = true; break; }
			
			vec3 normal = sdf_calc_normal(ray, sdf_map);
			float dND = dot(normal,dir);
			
			#define Aoffset (0.1f)
			float A = dND*0.5f+0.5f; A = pow(A,16.0f); A = 1.0f/Aoffset * lerp(A,1.0f, Aoffset);
			
			t += A*abs(dist);
			
			#ifdef _DEBUG
				SDF_NofNormalCalcCount++;
			#endif
		}
		
		if(found == false) break;
		if(s < Raymarch_NofSDFPasses-1) T[s+1] = t+2.0*treshold;
		T[s] = t;
	}
	
	#ifdef _DEBUG_SDF_Density
		float tsum = 0.0;
		for(int s = 0; s < Raymarch_NofSDFPasses/2; ++s)
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
	for(int s = 0; s < Raymarch_NofSDFPasses/2; ++s)
	{
		float t = T[s*2], t2 = T[s*2+1]; if(t < 0.0 || t2 < 0.0) break; //nema nista vise;
		float trange = (t2 - t);
		float tstep = trange / float(Raymarch_NofSteps);
				
		colsum = colsum + raymarchCloudsSample(start, dir, t+dither, tstep, t2+dither);
		
		if(colsum.a > 0.99f*float(Raymarch_NofSDFPasses/2)) break;
	}
	colsum = colsum / float(Raymarch_NofSDFPasses/2);
//---------------------------------------------------------------------------------
	
	#ifndef _DEBUG
		return colsum;
	#else
	
		#ifdef _DEBUG_SDF_Density
			return tovec4(vec3(tsum),1.0);
		#endif
		
		#ifdef _DEBUG_SDF_StepCount
			float fNofStepsCount = float(SDF_NofStepsCount) / float(Raymarch_NofSDFPasses * Raymarch_SDFPass_NofSteps);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
		#ifdef _DEBUG_SDF_NormalCalcCount
			float fNofNormCalcCount = float(SDF_NofNormalCalcCount) / float(Raymarch_NofSDFPasses * Raymarch_SDFPass_NofSteps);
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofNormCalcCount);
		#endif
		
		#ifdef _DEBUG_SDF_StepCountAndNormalCalcCount
			float fNofStepsCount = float(SDF_NofStepsCount + 4*SDF_NofNormalCalcCount) / float(Raymarch_NofSDFPasses * Raymarch_SDFPass_NofSteps); //4 jer ima 4 samplanja sdf funkcije u normal calc
			return lerp3pt(vec4(0.0,0.5,1.0,1.0), vec4(0.5,1.0,0.0,1.0), vec4(1.0,0.0,0.0,1.0), fNofStepsCount);
		#endif
		
	#endif
}
//===================================================================================================

//===================================================================================================
//pronalazi jeli potrebno izvrsavat raymarchMulti funkciju, i na kojoj udaljenosti gledat za t
//===================================================================================================
#define Raymarch_SDF_Tfind_NofSteps 16

float raymarchSDFfindT(in vec3 start, in vec3 dir, float t, float disttreshold)
{
	for(int i = 0; i < Raymarch_SDF_Tfind_NofSteps; ++i)
	{
		vec3 ray = start + t*dir;
		float dist = sdf_map(ray);
		
		if(abs(dist) <= disttreshold){ return max(t, 0.0); }
		
		t += (dist);
	}
	
	if(t > 10.0)
		return -1.0;
		
	return max(t, 0.0);
}
//===================================================================================================

// #define Display_Normals

void main(void)
{	
	Light light0 = Lights[0].light;
	float dither = rand(TexCoords)*0.125f;
	
	vec2 mouse = Mouse.xy / Resolution.xy;

	vec4 diffuse = texture2D(txBackground, TexCoords);
	vec3 normal = Normal;
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = normalize(light0.position.xyz - Position);
	vec3 ViewDir = normalize(ViewVector);
	
	vec4 rtn = vec4(0.0);
		
	float tstart = raymarchSDFfindT(Position, ViewDir, 0.95f*sdf_map(Position), 0.1);
	
	if(tstart >= 0.0)
		rtn = raymarchMulti(Position, ViewDir, 0.0, dither, 0.005f, diffuse.xyz);
			
	// rtn = raymarchCloudsSample(Position, ViewDir, dither);
		
	#ifdef Display_Normals
		if(tstart >= 0.0){
			rtn = raymarchSimpleNormal(Position, ViewDir, 0.0, 0.001f);
			rtn.xyz = rtn.xyz * 0.5 + 0.5;
		}
	#endif
	
	// gl_FragColor = tovec4(vec3( (T[1]) / 10.0), 1.0);
	gl_FragColor = tovec4(vec3(rtn), 1.0);
	// gl_FragColor = tovec4(normalize(ViewVector)*0.5+0.5, 1.0);
	// gl_FragColor = tovec4((normalize(PixelPosition)), 1.0);
	// gl_FragColor = tovec4(Position, 1.0);
}

























