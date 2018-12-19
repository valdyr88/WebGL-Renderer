
#ifndef GLSL_FLUIDSIM3D_INCLUDE
#define GLSL_FLUIDSIM3D_INCLUDE

vec3 toTexSpace(vec3 x){ return (x + vec3(0.5,0.5,0.5))/Resolution; }
vec3 toWorldSpace(vec3 x){ return x*Resolution - vec3(0.5,0.5,0.5); }
vec3 toWorldSpace(vec2 x, int z){ vec3 r = toWorldSpace(vec3(x.x,x.y,0.0f)); r.z = float(z)-0.5; return r; }

bool isAtBorder(vec3 x){
#define border_size (0)
	if(int(x.x) < border_size || int(x.x) >= int(Resolution.x)-border_size || 
	   int(x.y) < border_size || int(x.y) >= int(Resolution.y)-border_size ||
	   int(x.z) < border_size || int(x.z) >= int(Resolution.z)-border_size)
		return true;
	return false;
}

vec4 sampleLinear(sampler3D tx, vec3 x){
	return texture3DLod(tx, toTexSpace(x), 0.0);
}
vec4 sampleLinear(sampler3D tx, vec3 x, vec4 bordervalue){
	if(isAtBorder(x) == true) return bordervalue;
	return sampleLinear(tx, x);
}
vec4 samplePoint(sampler3D tx, vec3 x){
	return texelFetch(tx, ivec3(toTexSpace(x)*Resolution),0); //sample point
	// return sampleLinear(tx, x);
}
vec4 samplePoint(sampler3D tx, vec3 x, vec4 bordervalue){
	if(isAtBorder(x) == true) return bordervalue;
	return samplePoint(tx,x);
}


#define ProjectDDX(v,c,p) v = 2.0*c - p
// #define ProjectDDX(v,c,p) v = c - (p - c)
// #define ProjectDDX(v,c,p) v = c - 0.5*(p-c)

#define gradientBorderCorrect(x,dx,c,l,r,d,t,b,f)						\
		if(x.x + dx.x >= Resolution.x){ ProjectDDX(r,c,l); }		\
		else if(x.x - dx.x < 0.0){ ProjectDDX(l,c,r); }				\
		if(x.y + dx.y >= Resolution.y){ ProjectDDX(t,c,d); }		\
		else if(x.y - dx.y < 0.0){ ProjectDDX(d,c,t); }				\
		if(x.z + dx.z >= Resolution.z){ ProjectDDX(f,c,b); }		\
		else if(x.z - dx.z < 0.0){ ProjectDDX(b,c,f); }				\


#endif //GLSL_FLUIDSIM3D_INCLUDE
