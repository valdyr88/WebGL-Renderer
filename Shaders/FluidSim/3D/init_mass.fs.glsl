#version 300 es
// #extension GL_EXT_shader_texture_lod : require
//Inicijalizacija mase (pocetno stanje cloudsa npr)

precision mediump float;
precision mediump sampler3D;

#global_defines
#include "defines"
#include "functions"
#include "sdfunctions"
//------------------------------------------------------------------------------

#if defined(bHasColorComponent)
	#if bHasColorComponent == 1
		#define out_dim vec4
		#define out_comp xyzw
	#else
		#define out_dim float
		#define out_comp x
	#endif
#else
	#define bHasColorComponent 0
	#define out_dim float
	#define out_comp x
#endif

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out out_dim out_FragColor[NUM_OUT_BUFFERS];
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
	#define texture2DLod textureLod
	#define texture3DLod textureLod
#endif

uniform int z;
uniform float Time;
uniform vec3 aspect; //odnos dimenzija teksture i svijeta
uniform sampler3D txVelocity;
uniform sampler2D txNoiseRGB;
uniform float dT;

//------------------------------------------------------------------------------
#define varyin in

varyin vec2 TexCoords;
//------------------------------------------------------------------------------

#include "fluidsim3d_include"
// #define MassResolution

float noise(in vec3 x) //3d noise from iq https://www.shadertoy.com/view/XslGRr
{
    vec3 p = floor(x);
    vec3 f = fract(x);
	f = f*f*(3.0-2.0*f);
	vec2 uv = (p.xy+vec2(37.0,17.0)*p.z) + f.xy;
	vec2 rg = textureLod( txNoiseRGB, (uv+0.5)/256.0, 0.0 ).yx;
	return lerp( rg.x, rg.y, f.z );
}

float clouds(in vec3 p) //cloud from TekF https://www.shadertoy.com/view/lssGRX
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
// SDF gizmo container
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

//===================================================================================================


//===================================================================================================
float sample_clouds_density(in vec3 x)
{
	// x = toTexSpace(x);
	
	float dist = sdf_map(x);
	if(dist > 0.0f) return 0.0; //ako je dist pozitivan onda smo izvan sdf containera
	
	float dens_sdf = saturate(abs(dist)*1.0f);			
	float dens = dens_sdf * clouds(x);
	
	return dens;
}

vec3 sample_clouds_color(in vec3 x)
{
	return vec3(1.0,1.0,1.0);
}

vec4 sample_clouds_density_and_color(in vec3 x)
{
	float dens = sample_clouds_density(x);
	vec3 color = sample_clouds_color(x);
	
	return vec4(color.x, color.y, color.z, dens);
}

out_dim sample_clouds(in vec3 x)
{
	x = x * 0.01;

	#if bHasColorComponent == 1
		return sample_clouds_density_and_color(x);
	#else
		return sample_clouds_density(x);
	#endif
}
//===================================================================================================

float zToWorldSpace(int z){ return float(z) * (float(Resolution.z) / float(MassResolution.z)); }

void main(void)
{
	out_dim uadv[NUM_OUT_BUFFERS];

	for(int i = 0; i < NUM_OUT_BUFFERS; ++i)
	{	
		vec3 x = toWorldSpace( (TexCoords - vec2(0.5))*0.1, zToWorldSpace(z+i));
		// x.z /= 0.0625*MassResolution.z; x.z -= 7.5; 
		x.z /= 0.075*MassResolution.z; x.z -= 6.5;
		uadv[i] = (sdf_map(x) < 0.0)? 1.0 : 0.0;
		// uadv[i] = float(z+i) / float(NUM_OUT_BUFFERS);
		// uadv[i] = float(z+i) / MassResolution.z;
		
		uadv[i] = sample_clouds_density(x);
	}
	
	// gl_FragColor = uadv;
	WriteOutput(gl_FragColor, uadv);
}