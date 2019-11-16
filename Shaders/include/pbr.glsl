
#ifndef GLSL_PBR
#define GLSL_PBR

#ifndef PI
	#define PI (3.14159265359)
#endif
//======================================================================================
//PBR funkcije
//======================================================================================

//--------------------------------------------------------------------------------------
//	Fresnel aprox functions
//--------------------------------------------------------------------------------------
vec3 F_schlick(vec3 f0, float dotNV){
	return f0 + (vec3(1.0f)-f0)*pow(1.0f-dotNV,5.0f);
}
vec3 F_schlick(vec3 f0, float dotNV, float roughness){
	return f0 + (max(vec3(1.0f-roughness),f0) - f0)*pow(1.0f-dotNV,5.0f);
}

vec3 F0_schlick(float IoR, vec3 albedo, float metalness){
	vec3 f0 = vec3(abs((1.0f-IoR)/(1.0f+IoR)));
	f0 = f0*f0;
	return lerp(f0, albedo, metalness);
}

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

float G_schlickGGX(in float roughness, in float dotNV){
	float k = roughness*roughness*0.5f;
	return dotNV / (dotNV*(1.0f-k) + k);
}
float G_schlickGGX(in float roughness, in float dotNV, in float dotNL){ return G_schlickGGX(roughness, dotNV); }

float G_smithGGX(in float roughness, in float dotNV, in float dotNL){
	dotNV = max(dotNV,0.0f); dotNL = max(dotNL,0.0f);
	float ggx2 = G_schlickGGX(roughness, dotNV);
	float ggx1 = G_schlickGGX(roughness, dotNL);
	return ggx1 * ggx2;
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
float3 pbr_SampleSpecular(in float dotNL, in float dotNV, in float dotNH, in float3 F, in float roughness, in float rim_lighting){

	float D = D_GGX(roughness, dotNH);	
	float G = G_schlick(roughness, dotNV, dotNL);
	float R = R1(roughness, dotNV, rim_lighting);
	
	return R * F * D * G;
}
float3 pbr_SampleSpecular(in float dotNL, in float dotNV, in float dotNH, in float roughness, in vec3 f0, in float rim_lighting){

	float D = D_GGX(roughness, dotNH);	
	float G = G_schlick(roughness, dotNV, dotNL);
	float R = R1(roughness, dotNV, rim_lighting);
	vec3  F = F_schlick(f0, dotNV, roughness);
	
	return R * F * D * G;
}
//--------------------------------------------------------------------------------------

#ifndef AMBIENT_LIGHT_INCREASE_PERCENTAGE
	#define AMBIENT_LIGHT_INCREASE_PERCENTAGE 0.0f
#endif


#ifndef pbr_Sample_NofLights
	#define pbr_Sample_NofLights 4
#endif

#define AmbientMult( percentage ) (1.0f + ((percentage)/100.0f))
#ifndef AmbientMipMapLevels
	#define AmbientMipMapLevels 7.0f
#endif

float4 pbr_SampleAmbient(float3 t, float roughness){
	return AmbientMult(AMBIENT_LIGHT_INCREASE_PERCENTAGE) * textureLod(txAmbient, t, AmbientMipMapLevels * roughness );
}
float4 pbr_SampleAmbient(const samplerCube AmbientTx, const float AmbientLightIncreasePercent, float3 t, float roughness){
	return AmbientMult(AmbientLightIncreasePercent) * textureLod(AmbientTx, t, AmbientMipMapLevels * roughness );
}

#ifdef GAMMA_ENCODED_BRDF
float2 pbr_SampleBRDF(float2 t){
	return gamma(texture2D(txBRDF, 0.999f*vec2(t.x,1.0-t.y)+0.001f ).xy, 1.0f/GAMMA_ENCODED_BRDF);
}
#else
float2 pbr_SampleBRDF(float2 t){
	return texture2D(txBRDF, 0.999f*vec2(t.x,1.0-t.y)+0.001f ).xy;
}
#endif
//--------------------------------------------------------------------------------------

#define Light_isInfinite_bit 0

float3 pbr_Sample(vec3 position, vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness, 
				  float shadows[pbr_Sample_NofLights], float ambientOcclusion, vec3 viewVector, const samplerCube AmbientTx,
				  const float AmbientLightIncreasePercent, Light lights[pbr_Sample_NofLights], const int lightNo)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	float3 reflected = tofloat3(0.0f);
	float3 lightrefl = tofloat3(0.0f);
	float3 lightdiff = tofloat3(0.0f);
	
	//	analytic lightovi
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	for(int i = 0; i < lightNo; ++i){
	
		Light light = lights[i]; 
		if(light.intensity < 0.001f) continue;
		
		float3 L = vec3(0.0f,0.0f,0.0f); float dL2 = 1.0f;
		
		//	point light
		//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		if(Light_getLightType(light) == LightType_Point){
			L = light.position.xyz - position.xyz; 
			dL2 = dot(L,L); L = normalize(L);
		}
		//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		
		//  directional light
		//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		if(Light_getLightType(light) == LightType_Direction){
			L = normalize(light.position.xyz); //u position je sad smijer
			dL2 = 1.0f;
		}
		//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		
		//ToDo: provjeri ovo, jeli se koristi i dalje
		if( uint_getbit(light.flags, Light_isInfinite_bit) == true ){ dL2 = 2.0f; }
		
		float3 H = normalize(halfvec(V,L));
		
		float falloff = 1.0f / dL2;
		float3 lightval = shadows[i] * light.color.xyz * light.intensity * falloff;
		
		//float dotiNL= saturate(dot(Normal, L));
		float dotNL = saturate(dot(N,L));
		float dotNH = saturate(dot(N,H));
		float dotHV = saturate(dot(H,V));
		float dotLV = saturate(dot(L,V));
		
		float3 specfresnel = fresnel(specular, dotHV);
		float3 spec = pbr_SampleSpecular(dotNL, dotNV, dotNH, specfresnel, roughness, 0.0f) * dotNL;//moze i dotiNL
		
		float3 diff = (1.0f - specfresnel) * lambert_diffuse() * dotNL;
		
		lightrefl += lightval * spec;
		lightdiff += lightval * diff;
	}	
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	//	image based lighting 
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	float2 brdf = pbr_SampleBRDF(float2(roughness, dotNV));
	float3 iblspec = (fresnel(specular, dotNV) * brdf.x + brdf.y );
	
	float3 ambdiff = ambientOcclusion * pbr_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, N, 0.99f ).xyz;//(ako cemo radit ikad vise ambijenata koji se blendaju onda treba lerpat ova dva parametra (ambdiff, i ambrefl))
	float3 ambrefl = lerp(1.0f, ambientOcclusion, roughness ) * pbr_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, R, roughness ).xyz;
	
	lightrefl += iblspec * ambrefl;
	lightdiff += ambdiff * (tovec3(1.0f) - iblspec) * lambert_diffuse();
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	lightdiff = lightdiff * lerp( diffuse.xyz, tofloat3(0.0f), metalness );
	
	reflected += lightdiff + lightrefl;
	
	return reflected;
}

//--------------------------------------------------------------------------------------

void pbr_SampleLight(vec3 position, vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness,
					 float shadow, vec3 viewVector, Light light,
					 out float3 lightdiff, out float3 lightrefl)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	// float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	if(light.intensity < 0.001f) return;
	
	float3 L = vec3(0.0f,0.0f,0.0f); float dL2 = 1.0f;
	
	//	point light
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	if(Light_getLightType(light) == LightType_Point){
		L = light.position.xyz - position.xyz; 
		dL2 = dot(L,L); L = normalize(L);
	}
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	//  directional light
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	if(Light_getLightType(light) == LightType_Direction){
		L = normalize(light.position.xyz); //u position je sad smijer
		dL2 = 1.0f;
	}
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	
	//ToDo: provjeri ovo, jeli se koristi i dalje
	if( uint_getbit(light.flags, Light_isInfinite_bit) == true ){ dL2 = 2.0f; }
	
	float3 H = normalize(halfvec(V,L));
	
	float falloff = 1.0f / dL2;
	float3 lightval = shadow * light.color.xyz * light.intensity * falloff;
	
	//float dotiNL= saturate(dot(Normal, L));
	float dotNL = saturate(dot(N,L));
	float dotNH = saturate(dot(N,H));
	float dotHV = saturate(dot(H,V));
	float dotLV = saturate(dot(L,V));
	
	float3 f = fresnel(specular, dotNV);
	// float3 f = F_schlick(specular, dotNV, roughness);
	float3 spec = pbr_SampleSpecular(dotNL, dotNV, dotNH, f, roughness, 0.0f) * dotNL;//moze i dotiNL
	float3 diff = (1.0f-f)*(1.0f-metalness) * dotNL;// * lambert_diffuse()
	
	lightrefl += lightval * spec;
	lightdiff += lightval * diff;	
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
}

void pbr_SampleAmbient(vec3 diffuse, vec3 normal, vec3 specular, float roughness, float metalness,
					   float ambientOcclusion, vec3 viewVector, const samplerCube AmbientTx, const float AmbientLightIncreasePercent,
					   out float3 lightdiff, out float3 lightrefl)
{
	float3 N = normalize(normal);
	float3 V = normalize(-viewVector);
	float3 R = normalize(reflect(V,N));
	float dotNV = saturate(dot(N,V));
	
	float3 f = fresnel(specular, dotNV);
	// float3 f = F_schlick(specular, dotNV, roughness);
	
	//	image based lighting 
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
	float2 brdf = pbr_SampleBRDF(float2(roughness, dotNV));
	float3 iblspec = (f * brdf.x + brdf.y );
	float3 ibldiff = (vec3(1.0f)-f)*(1.0f-metalness); //jeli potrebno za ambientalnu diffuznu refleksiju koristit 1.0-fresnel?, jer difuzija svjetla dolazi iz raznih smjerova (raznih kutuva izmedju povrsine i upadne zrake)
	
	float3 ambdiff = ambientOcclusion * pbr_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, N, 0.99f ).xyz;//(ako cemo radit ikad vise ambijenata koji se blendaju onda treba lerpat ova dva parametra (ambdiff, i ambrefl))
	float3 ambrefl = lerp(1.0f, ambientOcclusion, roughness ) * pbr_SampleAmbient(AmbientTx, AmbientLightIncreasePercent, R, roughness ).xyz;
	
	lightrefl += iblspec * ambrefl;
	lightdiff += ibldiff * ambdiff;// * lambert_diffuse(); //lambert_diffuse() izostavljen jer povrsina ispada dosta tamna
	//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -	
}

vec3 pbr_IntegrateSamples(vec3 diffuse, float metalness, vec3 lightdiff, vec3 lightrefl){
	// lightdiff = lightdiff * lerp( diffuse.xyz, tofloat3(0.0f), metalness );
	return diffuse*lightdiff + lightrefl;
}
//--------------------------------------------------------------------------------------


// Importance sample
//--------------------------------------------------------------------------------------

float VanDerCorpus(uint n, uint base)
{
    float invBase = 1.0 / float(base);
    float denom   = 1.0;
    float result  = 0.0;

    for(uint i = 0u; i < 32u; ++i)
    {
        if(n > 0u)
        {
            denom   = mod(float(n), 2.0);
            result += denom * invBase;
            invBase = invBase / 2.0;
            n       = uint(float(n) / 2.0);
        }
    }

    return result;
}
// ----------------------------------------------------------------------------
vec2 HammersleyNoBitOps(uint i, uint N)
{
    return vec2(float(i)/float(N), VanDerCorpus(i, 2u));
}

float RadicalInverse_VdC(uint bits) 
{
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10; // / 0x100000000
}
vec2 Hammersley(uint i, uint N)
{
    // return vec2(float(i)/float(N), RadicalInverse_VdC(i));
	return HammersleyNoBitOps(i,N);
}

// ----------------------------------------------------------------------------
//Epic Games spherical sample 
vec3 ImportanceSampleVector_GGX(vec2 Xi, vec3 N, float roughness)
{
    float a = roughness*roughness;
	
    float phi = 2.0 * PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
	
    // from spherical coordinates to cartesian coordinates
    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;
	
    // from tangent-space vector to world-space sample vector
    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);
	
    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}

#ifndef IntegrateBRDF_G_function
#define IntegrateBRDF_G_function G_smithGGX
#endif

// ----------------------------------------------------------------------------
vec2 IntegrateBRDF(float dotNV, float roughness)
{
    vec3 V;
    V.x = sqrt(1.0 - dotNV*dotNV);
    V.y = 0.0;
    V.z = dotNV;
	V = normalize(V);

    float A = 0.0;
    float B = 0.0;
	
    vec3 N = vec3(0.0, 0.0, 1.0);

    const uint SAMPLE_COUNT = 32u;
    for(uint i = 0u; i < SAMPLE_COUNT; ++i)
    {
        vec2 Xi = Hammersley(i, SAMPLE_COUNT);
        vec3 H  = ImportanceSampleVector_GGX(Xi, N, roughness);
        vec3 L  = normalize(2.0 * dot(V, H) * H - V);

        float dotNL = max(L.z, 0.0);
        float dotNH = max(H.z, 0.0);
        float dotVH = max(dot(V, H), 0.0);
		
        if(dotNL > 0.0)
        {
            float G = IntegrateBRDF_G_function(roughness, dot(N,V), dot(N,L));
            float G_Vis = (G * dotVH) / (dotNH * dotNV);
            float Fc = pow(1.0 - dotVH, 5.0);

            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
        }
    }
    A /= float(SAMPLE_COUNT);
    B /= float(SAMPLE_COUNT);
    return vec2(A, B);
}

//--------------------------------------------------------------------------------------

//======================================================================================
#endif //GLSL_PBR































































