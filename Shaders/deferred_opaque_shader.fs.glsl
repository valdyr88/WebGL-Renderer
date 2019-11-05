#version 300 es
// #extension GL_EXT_shader_texture_lod : require
precision highp float;

#global_defines
#include "defines"
#include "functions"
#include "structs"
//------------------------------------------------------------------------------

#if __VERSION__ >= 300
	#define gl_FragColor out_FragColor
	layout(location = 0) out vec4 out_FragColor;
	layout(location = 1) out vec4 out_GlowColor;
#endif

#if __VERSION__ >= 120
	#define texture2D texture
	#define textureCube texture
	#define textureCubeLod textureLod
#endif

uniform sampler2D txDiffuse;
uniform sampler2D txNormal;
uniform sampler2D txAoRS;
uniform sampler2D txDepth;
uniform sampler2D txBRDF;
uniform samplerCube txAmbient;

uniform mat4 InverseViewProjectionMatrix;

uniform int uFlags;
#define getBitFlag(bit) uint_getbit(uFlags, (bit))
uniform float Time;
//------------------------------------------------------------------------------
#define varyin in

varyin vec3 PixelPosition;
varyin vec2 TexCoords;
varyin vec3 ViewVector;


#define gammaValue (1.0/1.3)
#define gammaScale (1.0/1.0)

//ToDo: treba napravit vertex shader koji racuna tocan ViewVector
#include "pbr"

//------------------------------------------------------------------------------
// uniform Light light0;
#include "ubLight"

//------------------------------------------------------------------------------

vec3 shade_hdr_decode(vec4 rgbe){
	rgbe = 255.0*rgbe;
	return hdr_decode(rgbe);
}

bool decode_MetalnessBit(float value){
	uint bits = uint(value*255.0f);
	return bool(bits & uint(0x01));
}
float decode_Emissive(float value){
	uint bits = uint(value*255.0f) >> 1;
	return 20.0f*gamma( float(bits)/127.0f, 2.2f);
}

vec3 shade_pbr(vec4 diffuse, vec3 normal, vec4 AoRSMtEm, float depth, float2 texCoord, mat4 InvVPMat){
	
	float roughness = clamp(AoRSMtEm.y,0.01f,0.99f);
	float ambientOcclusion = AoRSMtEm.x;
	
	float metalness = 0.0f;
	float3 specular = float3( AoRSMtEm.z*0.22f );
	
	normal = 2.0f*normal - 1.0f; normal = normalize(normal);
	vec3 position = PositionFromDepth(texCoord, depth, InvVPMat);
	
	if(decode_MetalnessBit(AoRSMtEm.a) == true){ //is metallic
		specular = float3( lerp( tofloat3(max(AoRSMtEm.z,0.22f)), diffuse.xyz, AoRSMtEm.z ));
		metalness = AoRSMtEm.z;
	}
	
	vec3 emissive = decode_Emissive(AoRSMtEm.a)*diffuse.rgb;
	
	Light lights[1];
	lights[0] = Lights[0].light;
		
	float3 reflected = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	
	for(int i = 0; i < 1; ++i)
		pbr_SampleLight(position.xyz, diffuse.xyz, normal.xyz, specular.xyz, roughness, metalness, 1.0f, ViewVector, lights[i], lightdiff, lightrefl);
	pbr_SampleAmbient(diffuse.xyz, normal.xyz, specular.xyz, roughness, metalness, ambientOcclusion, ViewVector, txAmbient, 0.0f, lightdiff, lightrefl);
	
	reflected = pbr_IntegrateSamples(diffuse.xyz, metalness, lightdiff, lightrefl);
	
	return reflected + emissive;
}

float edgeDetect(sampler2D tx, vec2 t, vec2 dt){
	vec2 s[9];// = { vec2(-1,-1), vec2(-1,0), vec2(-1,1), vec2(0,1), vec2(1,1), vec2(1,0), vec2(1,-1), vec2(0,-1), vec2(0,0) };
	s[0]=vec2(-1,-1);s[1]=vec2(-1,0);s[2]=vec2(-1,1);s[3]=vec2(0,1);s[4]=vec2(1,1);s[5]=vec2(1,0);s[6]=vec2(1,-1);s[7]=vec2(0,-1);s[8]=vec2(0,0);
	float samples[9];
	
	for(int i = 0; i < 9; ++i){
		samples[i] = LinearizeDepth(textureLod(tx, t + dt*s[i], 0.0f).x, 0.1, 1000.0); }
	
	float maxdiff = 0.0;
	
	for(int i = 0; i < 8; ++i){
		float diff = abs(samples[i] - samples[8]);
		if(diff > maxdiff) maxdiff = diff;
	}
	
	return 10.0f*maxdiff;
}

void main(void)
{
	Light light0 = Lights[0].light;
	vec4 diffuse  = texture2D(txDiffuse, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	vec4 normal   = texture2D(txNormal, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	vec4 AoRSMtEm = texture2D(txAoRS, vec2(TexCoords.x, 1.0f-TexCoords.y) );
	float depth   = texture2D(txDepth, vec2(TexCoords.x, 1.0f-TexCoords.y) ).x;
		
	normal.xyz = unpackNormalFromRGB8(normal.xyz)*0.5f + 0.5f;
	int ShaderID = deferred_read_shader_type(normal.a);
	
	vec3 position = PositionFromDepth(vec2(TexCoords.x, 1.0f-TexCoords.y), depth, InverseViewProjectionMatrix);
	// 
	vec3 shade = vec3(1.0, 0.6, 0.2);
	
	switch(ShaderID){
		case deferred_shader_pbr: shade = shade_pbr(diffuse, normal.xyz, AoRSMtEm, depth, vec2(TexCoords.x, 1.0f-TexCoords.y), InverseViewProjectionMatrix); break;
		case deferred_shader_hdre: shade = shade_hdr_decode(diffuse); break;
		case deferred_shader_simpleColor: shade = diffuse.xyz; break;
		default: break;
	}
	/* 
	normal.xyz = 2.0*normal.xyz-1.0;
	vec3 toCamera = normalize(-ViewVector);
	vec3 toLight = normalize(light0.position.xyz - position);
	float dVN = dot(normal.xyz,toCamera);
	float dLN = dot(normal.xyz,toLight);
	
	float dLNv95 = float(dLN > 0.1);
	shade = vec3(shade.x,shade.y,shade.z+dLNv95);
	// shade = vec3(dLN > 0.1);
	*/
	// float d = desaturate(shade);
	// shade = tovec3(d);
	// if(d > 1.0f) shade = vec3(0.7,0.1,0.9);
	
	shade = gammaScale * gamma(shade, gammaValue);
	/*
	float dotNV = dot(2.0f*normal.xyz-1.0f,normalize(-ViewVector.xyz));
	float3 specular = float3( lerp( tofloat3(max(AoRSMt.z,0.22f)), diffuse.xyz, AoRSMt.z ));
	// specular = vec3(0.0f);
	float3 f = fresnel(specular, dotNV);
	// f = fresnel(vec3(0.05f), dotNV);
	
	float roughness = clamp(AoRSMt.y,0.01f,0.99f);
	float2 brdf = pbr_SampleBRDF(float2(roughness, dotNV));
	float3 iblspec = vec3(f*brdf.x + brdf.y );
	// if(PixelPosition.x > 0.5f)
		// shade.xyz = vec3(brdf.x + brdf.y);
		shade.xyz = vec3(iblspec);
		// shade.xyz = vec3(f);
		// shade.xyz = vec3(brdf,0.0f);
		// shade.xyz = vec3(dotNV);
	
	float3 f = fresnel(vec3(0.05f), dotNV);
	shade = f;
	
	if(ShaderID != deferred_shader_pbr)
		shade = vec3(0.0);
	*/
	// shade = vec3(AoRSMt.g);
	// shade = vec3(dot(normal.xyz, normalize(ViewVector)));
	
	// shade = diffuse.xyz;
	// shade = normal.xyz;
	
	// depth = LinearizeDepth(depth, 0.1, 1000.0);
	// shade = vec3( pow(depth,0.20f) );
	
	// float maxdiff = edgeDetect(txDepth, vec2(TexCoords.x, 1.0f-TexCoords.y), 1.0f/vec2(1920.0f,1080.0f));
	// shade = vec3(maxdiff);
	
	// gl_FragColor = prepare_output(shade);	
	#ifdef USE_HDR_RGBA8
		gl_FragColor = hdr_encode(shade.xyz);
	#else
		gl_FragColor = tovec4(shade,1.0f);
	#endif
	
	if(ShaderID == deferred_shader_pbr)
		out_GlowColor.xyz = gamma( saturate( (shade-vec3(1.0f)) / 5.0f ), 1.0f/1.2f);
	else
		out_GlowColor.xyz = vec3(0.0f);
	out_GlowColor.a = 1.0f;
}
