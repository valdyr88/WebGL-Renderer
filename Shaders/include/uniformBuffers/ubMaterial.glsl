
#ifdef MaterialType_PBR
layout (std140) uniform ubMaterial
{
	vec4 color; 			//4
	float specular;
	float roughness;
	float metalness;
	int flags; 				//8
} Material;
#endif //MaterialType_PBR

#ifdef MaterialType_SimpleColor
layout (std140) uniform ubMaterial
{
	vec4 color;				//4
	vec4 padding01;			//8
} Material;
#endif //MaterialType_SimpleColor

















































































