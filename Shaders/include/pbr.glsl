
#ifndef GLSL_PBR
#define GLSL_PBR

#ifndef PI
	#define PI (3.14159265359)
#endif
//======================================================================================
//PBR funkcije
//======================================================================================

//bazirano na UE4. 

//--------------------------------------------------------------------------------------
//	Diffuse term function
//--------------------------------------------------------------------------------------
float3 lambert_diffuse(float3 color){
	return color / PI;
}
float lambert_diffuse(){
	return 1.0f / PI;
}
//--------------------------------------------------------------------------------------
//	Distribution functions
//--------------------------------------------------------------------------------------
float D_blinn(in float roughness, in float dotNH){
	float a = roughness*roughness; float a2 = a*a;
	float n = 2.0f / a2 - 2.0f;
	return (n+2.0f) / (2.0f*PI) * pow(dotNH, n);
}

float D_beckmann(in float roughness, in float dotNH){
	float a = roughness*roughness; float a2 = a*a;
	float dotNH2 = dotNH*dotNH;
	return exp((dotNH-1.0f) / (a2*dotNH2)) / (PI*a2*dotNH2*dotNH2);
}

float D_GGX(in float roughness, in float dotNH){
	float a = roughness*roughness; float a2 = a*a;
	float div = (dotNH*dotNH) * (a2 - 1.0f) + 1.0f;
		  div = PI*(div*div);
	return a2 / div;
}
//--------------------------------------------------------------------------------------
//	Geometry attenuation (self shadowing) functions
//--------------------------------------------------------------------------------------
float G_schlick(in float roughness, in float dotNV, in float dotNL){
	float k = roughness*roughness*0.5f;
	float V = dotNV * (1.0f - k) + k;
	float L = dotNL * (1.0f - k) + k;
	return 0.25f / (V*L);
}
float G1V(float dotNV, float k){
	return 1.0f / ( dotNV*(1.0f-k) + k );
}
float G_smith(in float roughness, in float dotNV, in float dotNL){
	float k = roughness*roughness*0.5f;
	return G1V(dotNL,k)*G1V(dotNV,k);
}
//--------------------------------------------------------------------------------------
//	Rim lighting functions
//--------------------------------------------------------------------------------------
float R1(float roughness, float dotNV, float param){
	float r = 1.0f - (1.0f-dotNV)*roughness*param*0.85f; return 1.0f / r;
}
//--------------------------------------------------------------------------------------
//	specular functions
//--------------------------------------------------------------------------------------
float3 PBR_SampleSpecular(in float dotNL, in float dotNV, in float dotNH, in float3 F, in float roughness, in float rim_lighting){

	float D = D_GGX(roughness, dotNH);	
	float G = G_schlick(roughness, dotNV, dotNL);
	float R = R1(roughness, dotNV, rim_lighting);
	
	return R * F * D * G;
}
//--------------------------------------------------------------------------------------

#ifndef AMBIENT_LIGHT_INCREASE_PERCENTAGE
	#define AMBIENT_LIGHT_INCREASE_PERCENTAGE 0.0f
#endif

#ifndef PBR_Sample_NofLights
	#define PBR_Sample_NofLights 4
#endif

#define AmbientMult( percentage ) (1.0f + ((percentage)/100.0f))
#ifndef AmbientMipMapLevels
	#define AmbientMipMapLevels 7.0f
#endif

float4 PBR_SampleAmbient(float3 t, float roughness){
	return AmbientMult(AMBIENT_LIGHT_INCREASE_PERCENTAGE) * textureLod(txAmbient, t, AmbientMipMapLevels * roughness );
}
float4 PBR_SampleAmbient(const samplerCube AmbientTx, const float AmbientLightIncreasePercent, float3 t, float roughness){
	return AmbientMult(AmbientLightIncreasePercent) * textureLod(AmbientTx, t, AmbientMipMapLevels * roughness );
}

float2 PBR_SampleBRDF(float2 t){
	return texture2D(txBRDF, t*0.9925f + 0.00375f ).xy;
}
//--------------------------------------------------------------------------------------

#define Light_isInfinite_bit 0

float3 PBR_Sample(vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness, 
				  float shadows[PBR_Sample_NofLights], float ambientOcclusion, vec3 viewVector, const samplerCube AmbientTx,
				  const float AmbientLightIncreasePercent, Light lights[PBR_Sample_NofLights], const int lightNo)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	float3 reflected = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	
	//	point lightovi
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	for(int i = 0; i < lightNo; ++i){
	
		Light light = lights[i]; 
		if(light.intensity < 0.001f) continue;
		
		float3 L = light.position.xyz - Position.xyz; 
		float dL2 = dot(L,L); L = normalize(L);
		float3 H = normalize(halfvec(V,L));
		
		if( uint_getbit(light.flags, Light_isInfinite_bit) == true ){ dL2 = 2.0f; }
		float falloff = 1.0f / dL2;
		float3 lightval = shadows[i] * light.color.xyz * light.intensity * falloff;
		
		float dotiNL= saturate(dot(Normal, L));
		float dotNL = saturate(dot(N,L));
		float dotNH = saturate(dot(N,H));
		float dotHV = saturate(dot(H,V));
		float dotLV = saturate(dot(L,V));
		
		float3 specfresnel = fresnel(specular, dotHV);
		float3 spec = PBR_SampleSpecular(dotNL, dotNV, dotNH, specfresnel, roughness, 0.0f) * dotNL;//moze i dotiNL
		
		float3 diff = (1.0f - specfresnel) * lambert_diffuse() * dotNL;
		
		lightrefl += lightval * spec;
		lightdiff += lightval * diff;
	}	
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	//	image based lighting 
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	float2 brdf = PBR_SampleBRDF(float2(roughness, dotNV));
	float3 iblspec = (fresnel(specular, dotNV) * brdf.x + brdf.y );
	
	float3 ambdiff = ambientOcclusion * PBR_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, N, 0.99f ).xyz;//(ako cemo radit ikad vise ambijenata koji se blendaju onda treba lerpat ova dva parametra (ambdiff, i ambrefl))
	float3 ambrefl = lerp(1.0f, ambientOcclusion, roughness ) * PBR_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, R, roughness ).xyz;
	
	lightrefl += iblspec * ambrefl;
	lightdiff += ambdiff * (tovec3(1.0f) - iblspec) * lambert_diffuse();
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	lightdiff = lightdiff * lerp( diffuse.xyz, tofloat3(0.0f), metalness );
	
	reflected += lightdiff + lightrefl;
	
	return reflected;
}

//--------------------------------------------------------------------------------------

void PBR_SampleLight(vec3 position, vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness,
					 float shadow, vec3 viewVector, Light light,
					 out float3 lightdiff, out float3 lightrefl)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	// float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	if(light.intensity < 0.001f) return;
	
	//	point light
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	float3 L = light.position.xyz - position.xyz; 
	float dL2 = dot(L,L); L = normalize(L);
	float3 H = normalize(halfvec(V,L));
	
	if( uint_getbit(light.flags, Light_isInfinite_bit) == true ){ dL2 = 2.0f; }
	float falloff = 1.0f / dL2;
	float3 lightval = shadow * light.color.xyz * light.intensity * falloff;
	
	float dotiNL= saturate(dot(Normal, L));
	float dotNL = saturate(dot(N,L));
	float dotNH = saturate(dot(N,H));
	float dotHV = saturate(dot(H,V));
	float dotLV = saturate(dot(L,V));
	
	float3 specfresnel = fresnel(specular, dotHV);
	float3 spec = PBR_SampleSpecular(dotNL, dotNV, dotNH, specfresnel, roughness, 0.0f) * dotNL;//moze i dotiNL
	
	float3 diff = (1.0f - specfresnel) * lambert_diffuse() * dotNL;
	
	lightrefl += lightval * spec;
	lightdiff += lightval * diff;	
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
}

void PBR_SampleAmbient(vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness,
					   float ambientOcclusion, vec3 viewVector, const samplerCube AmbientTx, const float AmbientLightIncreasePercent,
					   out float3 lightdiff, out float3 lightrefl)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	//	image based lighting 
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	float2 brdf = PBR_SampleBRDF(float2(roughness, dotNV));
	float3 iblspec = (fresnel(specular, dotNV) * brdf.x + brdf.y );
	
	float3 ambdiff = ambientOcclusion * PBR_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, N, 0.99f ).xyz;//(ako cemo radit ikad vise ambijenata koji se blendaju onda treba lerpat ova dva parametra (ambdiff, i ambrefl))
	float3 ambrefl = lerp(1.0f, ambientOcclusion, roughness ) * PBR_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, R, roughness ).xyz;
	
	lightrefl += iblspec * ambrefl;
	lightdiff += ambdiff * (tovec3(1.0f) - iblspec) * lambert_diffuse();
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -	
}

vec3 PBR_IntegrateSamples(vec3 diffuse, float metalness, vec3 lightdiff, vec3 lightrefl){
	lightdiff = lightdiff * lerp( diffuse.xyz, tofloat3(0.0f), metalness );
	return lightdiff + lightrefl;
}
//--------------------------------------------------------------------------------------

//======================================================================================
#endif //GLSL_PBR































































