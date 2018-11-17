
#ifndef GLSL_STRUCTS
#define GLSL_STRUCTS

struct Light{
	vec4 position;
	vec4 color;
	float intensity;
	int flags;
};

Light CreateLight(vec3 pos, float inten){ Light light; light.position.xyz = pos; light.position.a = 0.0; light.intensity = inten; return light; }
float Light_Calculate(const Light light, vec3 pos){

	vec3 toCenter = light.position.xyz - pos;
	float dist = dot(toCenter, toCenter);
	
	return light.intensity / (dist);
}
vec3 Light_DirToLight(const Light light, vec3 pos){
	vec3 dir = light.position.xyz - pos;
	return normalize(dir);
}

#endif //GLSL_STRUCTS











































































