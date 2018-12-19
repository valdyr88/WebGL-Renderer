
#ifndef GLSL_FLUIDSIM2D_INCLUDE
#define GLSL_FLUIDSIM2D_INCLUDE

vec2 toTexSpace(vec2 x){ return (x + vec2(0.5,0.5))/Resolution.xy; }
vec2 toWorldSpace(vec2 x){ return x*Resolution.xy - vec2(0.5,0.5); }

bool isAtBorder(vec2 x){
#define border_size (0)
	if(int(x.x) < border_size || int(x.x) >= int(Resolution.x)-border_size || 
	   int(x.y) < border_size || int(x.y) >= int(Resolution.y)-border_size)
		return true;
	return false;
}

vec4 sampleLinear(sampler2D tx, vec2 x){
	return texture2DLod(tx, toTexSpace(x), 0.0);
}
vec4 sampleLinear(sampler2D tx, vec2 x, vec4 bordervalue){
	if(isAtBorder(x) == true) return bordervalue;
	return texture2DLod(tx, toTexSpace(x), 0.0);
}
vec4 samplePoint(sampler2D tx, vec2 x){
	return texelFetch(tx, ivec2(toTexSpace(x)*Resolution.xy),0); //sample point
	// return sampleLinear(tx, x);
}
vec4 samplePoint(sampler2D tx, vec2 x, vec4 bordervalue){
	if(isAtBorder(x) == true) return bordervalue;
	return samplePoint(tx,x);//vec2(txSize)
}


#define ProjectDDX(v,c,p) v = 2.0*c - p
// #define ProjectDDX(v,c,p) v = c - (p - c)
// #define ProjectDDX(v,c,p) v = c - 0.5*(p-c)

#define gradientBorderCorrect(x,dx,c,l,r,d,t)						\
		if(x.x + dx.x >= Resolution.x){ ProjectDDX(r,c,l); }		\
		else if(x.x - dx.x < 0.0){ ProjectDDX(l,c,r); }				\
		if(x.y + dx.y >= Resolution.y){ ProjectDDX(t,c,d); }		\
		else if(x.y - dx.y < 0.0){ ProjectDDX(d,c,t); }				\


#endif //GLSL_FLUIDSIM2D_INCLUDE
