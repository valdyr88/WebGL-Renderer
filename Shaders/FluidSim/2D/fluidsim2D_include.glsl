#ifndef GLSL_FLUIDSIM2D_INCLUDE
#define GLSL_FLUIDSIM2D_INCLUDE

vec2 toTexSpace(vec2 x){ return x/Resolution; }
vec2 toWorldSpace(vec2 x){ return x*Resolution; }

vec4 samplePoint(sampler2D tx, vec2 x){
	// ivec2 txSize = textureSize(tx, 0);
	return texelFetch(tx, ivec2(toTexSpace(x)*Resolution),0); //sample point
}
vec4 samplePoint(sampler2D tx, ivec2 txSize, vec2 x){
	return texelFetch(tx, ivec2(toTexSpace(x)*Resolution),0);//vec2(txSize)
}
vec4 sampleLinear(sampler2D tx, vec2 x){
	return texture2DLod(tx, toTexSpace(x), 0.0);
}

bool isAtBorder(vec2 x){
	if(int(x.x) <= 0 || int(x.y) <= 0 || int(x.x) >= int(Resolution.x) || int(x.y) >= int(Resolution.y))
		return true;
	return false;
}

#endif //GLSL_FLUIDSIM2D_INCLUDE