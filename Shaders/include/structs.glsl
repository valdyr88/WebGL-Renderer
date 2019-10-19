
#ifndef GLSL_STRUCTS
#define GLSL_STRUCTS

struct Light{
	vec4 position;
	vec4 color;
	float intensity;
	int flags;
};

#define LightType_Point 1
#define LightType_Direction 2
#define LightType_Spot 3
#define getLightType(f) ((f) >> 29)

Light CreateLight(vec3 pos, float inten){ Light light; light.position.xyz = pos; light.position.a = 0.0; light.intensity = inten; return light; }
float Light_Calculate(const Light light, vec3 pos){

	vec3 toLight = light.position.xyz - pos;
	float dist2 = dot(toLight, toLight);
	
	return light.intensity / (dist2);
}
vec3 Light_DirToLight(const Light light, vec3 pos){
	vec3 dir = light.position.xyz - pos;
	return normalize(dir);
}

int Light_getLightType(const Light light){
	return getLightType(light.flags);
}

#endif //GLSL_STRUCTS











































































