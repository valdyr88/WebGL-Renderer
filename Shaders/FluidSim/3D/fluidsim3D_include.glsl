
#ifndef GLSL_FLUIDSIM3D_INCLUDE
#define GLSL_FLUIDSIM3D_INCLUDE

vec3 toTexSpace(vec3 x){ return (x + vec3(0.0,0.0,1.0))/Resolution; }
vec3 toWorldSpace(vec3 x){ return x*Resolution - vec3(0.0,0.0,0.0); }
vec3 toWorldSpace(vec2 x, int z){ vec3 r = toWorldSpace(vec3(x.x,x.y,0.0f)); r.z = float(z)-0.5; return r; }
vec3 toWorldSpace(vec2 x, float z){ vec3 r = toWorldSpace(vec3(x.x,x.y,0.0f)); r.z = z-0.5; return r; }

// #define border_size (0)

bool isAtBorder(in vec3 x, in int border_size){
	if(int(x.x) < border_size || int(x.x) >= int(Resolution.x)-border_size || 
	   int(x.y) < border_size || int(x.y) >= int(Resolution.y)-border_size ||
	   int(x.z) < border_size || int(x.z) >= int(Resolution.z)-border_size)
		return true;
	return false;
}
bool isAtBorder(vec3 x){
	return isAtBorder(x, 0);
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

// #define FINITE_DIFFERENCE_FINE

#if !defined(FINITE_DIFFERENCE_COARSE) && !defined(FINITE_DIFFERENCE_FINE)
	#define FINITE_DIFFERENCE_COARSE
	// #define FINITE_DIFFERENCE_FINE
#endif

vec4 laplace(vec4 c, sampler3D tx, vec3 x, vec3 dx){
	vec4 s[6];
	s[0] = samplePoint(tx, x + vec3( dx.x,0.0,0.0));
	s[1] = samplePoint(tx, x + vec3(-dx.x,0.0,0.0));
	s[2] = samplePoint(tx, x + vec3(0.0, dx.y,0.0));
	s[3] = samplePoint(tx, x + vec3(0.0,-dx.y,0.0));
	s[4] = samplePoint(tx, x + vec3(0.0,0.0, dx.z));
	s[5] = samplePoint(tx, x + vec3(0.0,0.0,-dx.z));
	
#ifndef FINITE_DIFFERENCE_FINE
	return s[0]+s[1]+s[2]+s[3]+s[4]+s[5] - 6.0*c;
#else
	vec4 u[20];
	vec3 dx2 = (1.0/sqrt(2.0))*dx;
	vec3 dx3 = (1.0/sqrt(3.0))*dx;
	u[0]  = sampleLinear(tx, x + vec3( dx3.x, dx3.y, dx3.z));
	u[1]  = sampleLinear(tx, x + vec3(-dx3.x, dx3.y, dx3.z));
	u[2]  = sampleLinear(tx, x + vec3( dx3.x,-dx3.y, dx3.z));
	u[3]  = sampleLinear(tx, x + vec3(-dx3.x,-dx3.y, dx3.z));
	u[4]  = sampleLinear(tx, x + vec3( dx3.x, dx3.y,-dx3.z));
	u[5]  = sampleLinear(tx, x + vec3(-dx3.x, dx3.y,-dx3.z));
	u[6]  = sampleLinear(tx, x + vec3( dx3.x,-dx3.y,-dx3.z));
	u[7]  = sampleLinear(tx, x + vec3(-dx3.x,-dx3.y,-dx3.z));
	
	u[8]  = sampleLinear(tx, x + vec3( dx2.x, dx2.y, 0.0));
	u[9]  = sampleLinear(tx, x + vec3(-dx2.x, dx2.y, 0.0));
	u[10] = sampleLinear(tx, x + vec3( dx2.x,-dx2.y, 0.0));
	u[11] = sampleLinear(tx, x + vec3(-dx2.x,-dx2.y, 0.0));
	u[12] = sampleLinear(tx, x + vec3( dx2.x, 0.0, dx2.z));
	u[13] = sampleLinear(tx, x + vec3(-dx2.x, 0.0, dx2.z));
	u[14] = sampleLinear(tx, x + vec3( dx2.x, 0.0,-dx2.z));
	u[15] = sampleLinear(tx, x + vec3(-dx2.x, 0.0,-dx2.z));
	u[16] = sampleLinear(tx, x + vec3( 0.0, dx2.y, dx2.z));
	u[17] = sampleLinear(tx, x + vec3( 0.0,-dx2.y, dx2.z));
	u[18] = sampleLinear(tx, x + vec3( 0.0, dx2.y,-dx2.z));
	u[19] = sampleLinear(tx, x + vec3( 0.0,-dx2.y,-dx2.z));
	
	vec4 S = s[0]+s[1]+s[2]+s[3]+s[4]+s[5];
	vec4 U1 = u[0]+u[1]+u[2]+u[3]+u[4]+u[5]+u[6]+u[7];
	vec4 U2 = u[8]+u[9]+u[10]+u[11]+u[12]+u[13]+u[14]+u[15]+u[16]+u[17]+u[18]+u[19];
	
	return S+U1+U2-26.0*c;
#endif
}

vec3 laplace(vec3 c, sampler3D tx, vec3 x, vec3 dx){
	return laplace(vec4(c.x,c.y,c.z,0.0), tx, x, dx).xyz;
}
vec2 laplace(vec2 c, sampler3D tx, vec3 x, vec3 dx){
	return laplace(vec4(c.x,c.y,0.0,0.0), tx, x, dx).xy;
}
float laplace(float c, sampler3D tx, vec3 x, vec3 dx){
	return laplace(vec4(c,0.0,0.0,0.0), tx, x, dx).x;
}

float divergence(sampler3D tx, vec3 x, vec3 dx){
	
	float s[6];
	
	s[0] = samplePoint(tx, x + vec3( dx.x,  0.0,  0.0)).x;
	s[1] = samplePoint(tx, x + vec3(-dx.x,  0.0,  0.0)).x;
	s[2] = samplePoint(tx, x + vec3(  0.0, dx.y,  0.0)).y;
	s[3] = samplePoint(tx, x + vec3(  0.0,-dx.y,  0.0)).y;
	s[4] = samplePoint(tx, x + vec3(  0.0,  0.0, dx.z)).z;
	s[5] = samplePoint(tx, x + vec3(  0.0,  0.0,-dx.z)).z;
	
#ifndef FINITE_DIFFERENCE_FINE
	return 0.5*((s[0] - s[1]) + (s[2] - s[3]) + (s[4] - s[5]));
#else
	float u[20];
	vec3 dx2 = (1.0/sqrt(2.0))*dx;
	vec3 dx3 = (1.0/sqrt(3.0))*dx;
	u[0] =  dot(sampleLinear(tx, x + vec3( dx3.x, dx3.y, dx3.z)).xyz, dx3.xyz);
	u[1] =  dot(sampleLinear(tx, x + vec3(-dx3.x, dx3.y, dx3.z)).xyz, dx3.xyz);
	u[2] =  dot(sampleLinear(tx, x + vec3( dx3.x,-dx3.y, dx3.z)).xyz, dx3.xyz);
	u[3] =  dot(sampleLinear(tx, x + vec3(-dx3.x,-dx3.y, dx3.z)).xyz, dx3.xyz);
	u[4] =  dot(sampleLinear(tx, x + vec3( dx3.x, dx3.y,-dx3.z)).xyz, dx3.xyz);
	u[5] =  dot(sampleLinear(tx, x + vec3(-dx3.x, dx3.y,-dx3.z)).xyz, dx3.xyz);
	u[6] =  dot(sampleLinear(tx, x + vec3( dx3.x,-dx3.y,-dx3.z)).xyz, dx3.xyz);
	u[7] =  dot(sampleLinear(tx, x + vec3(-dx3.x,-dx3.y,-dx3.z)).xyz, dx3.xyz);
	
	u[8] =  dot(sampleLinear(tx, x + vec3( dx2.x, dx2.y, 0.0)).xy, dx2.xy);
	u[9] =  dot(sampleLinear(tx, x + vec3(-dx2.x, dx2.y, 0.0)).xy, dx2.xy);
	u[10] = dot(sampleLinear(tx, x + vec3( dx2.x,-dx2.y, 0.0)).xy, dx2.xy);
	u[11] = dot(sampleLinear(tx, x + vec3(-dx2.x,-dx2.y, 0.0)).xy, dx2.xy);
	u[12] = dot(sampleLinear(tx, x + vec3( dx2.x, 0.0, dx2.z)).xz, dx2.xz);
	u[13] = dot(sampleLinear(tx, x + vec3(-dx2.x, 0.0, dx2.z)).xz, dx2.xz);
	u[14] = dot(sampleLinear(tx, x + vec3( dx2.x, 0.0,-dx2.z)).xz, dx2.xz);
	u[15] = dot(sampleLinear(tx, x + vec3(-dx2.x, 0.0,-dx2.z)).xz, dx2.xz);
	u[16] = dot(sampleLinear(tx, x + vec3( 0.0, dx2.y, dx2.z)).yz, dx2.yz);
	u[17] = dot(sampleLinear(tx, x + vec3( 0.0,-dx2.y, dx2.z)).yz, dx2.yz);
	u[18] = dot(sampleLinear(tx, x + vec3( 0.0, dx2.y,-dx2.z)).yz, dx2.yz);
	u[19] = dot(sampleLinear(tx, x + vec3( 0.0,-dx2.y,-dx2.z)).yz, dx2.yz);
	
	float S = (s[0] - s[1]) + (s[2] - s[3]) + (s[4] - s[5]);
	float U1 = (u[0] - u[7]) + (u[1] - u[6]) + (u[2] - u[5]) + (u[3] - u[4]);
	float U2 = (u[8] - u[11]) + (u[9] - u[10]) + (u[12] - u[15]) + (u[13] - u[14]) + (u[16] - u[19]) + (u[17] - u[18]);
	
	return 0.5*(S+U1+U2);
#endif
}

vec3 gradient(sampler3D tx, vec3 x, vec3 dx){
		
	float s[6];
	s[0] = samplePoint(tx, x + vec3( dx.x,  0.0,  0.0)).x;
	s[1] = samplePoint(tx, x + vec3(-dx.x,  0.0,  0.0)).x;
	s[2] = samplePoint(tx, x + vec3(  0.0, dx.y,  0.0)).x;
	s[3] = samplePoint(tx, x + vec3(  0.0,-dx.y,  0.0)).x;
	s[4] = samplePoint(tx, x + vec3(  0.0,  0.0, dx.z)).x;
	s[5] = samplePoint(tx, x + vec3(  0.0,  0.0,-dx.z)).x;
	
#ifndef FINITE_DIFFERENCE_FINE
	return 0.5*vec3( s[0]-s[1], s[2]-s[3], s[4]-s[5] );
#else
	vec3 u2[12];
	vec3 u3[8];
	vec3 dx2 = (1.0/sqrt(2.0))*dx;
	vec3 dx3 = (1.0/sqrt(3.0))*dx;
	
	u3[0] = sampleLinear(tx, x + vec3( dx3.x, dx3.y, dx3.z)).x * dx3.xyz;
	u3[1] = sampleLinear(tx, x + vec3(-dx3.x, dx3.y, dx3.z)).x * dx3.xyz;
	u3[2] = sampleLinear(tx, x + vec3( dx3.x,-dx3.y, dx3.z)).x * dx3.xyz;
	u3[3] = sampleLinear(tx, x + vec3(-dx3.x,-dx3.y, dx3.z)).x * dx3.xyz;
	u3[4] = sampleLinear(tx, x + vec3( dx3.x, dx3.y,-dx3.z)).x * dx3.xyz;
	u3[5] = sampleLinear(tx, x + vec3(-dx3.x, dx3.y,-dx3.z)).x * dx3.xyz;
	u3[6] = sampleLinear(tx, x + vec3( dx3.x,-dx3.y,-dx3.z)).x * dx3.xyz;
	u3[7] = sampleLinear(tx, x + vec3(-dx3.x,-dx3.y,-dx3.z)).x * dx3.xyz;
	
	u2[0].xy  = sampleLinear(tx, x + vec3( dx2.x, dx2.y, 0.0)).x * dx2.xy;
	u2[1].xy  = sampleLinear(tx, x + vec3(-dx2.x, dx2.y, 0.0)).x * dx2.xy;
	u2[2].xy  = sampleLinear(tx, x + vec3( dx2.x,-dx2.y, 0.0)).x * dx2.xy;
	u2[3].xy  = sampleLinear(tx, x + vec3(-dx2.x,-dx2.y, 0.0)).x * dx2.xy;
	
	u2[4].xz  = sampleLinear(tx, x + vec3( dx2.x, 0.0, dx2.z)).x * dx2.xz;
	u2[5].xz  = sampleLinear(tx, x + vec3(-dx2.x, 0.0, dx2.z)).x * dx2.xz;
	u2[6].xz  = sampleLinear(tx, x + vec3( dx2.x, 0.0,-dx2.z)).x * dx2.xz;
	u2[7].xz  = sampleLinear(tx, x + vec3(-dx2.x, 0.0,-dx2.z)).x * dx2.xz;
	
	u2[8].yz  = sampleLinear(tx, x + vec3( 0.0, dx2.y, dx2.z)).x * dx2.yz;
	u2[9].yz  = sampleLinear(tx, x + vec3( 0.0,-dx2.y, dx2.z)).x * dx2.yz;
	u2[10].yz = sampleLinear(tx, x + vec3( 0.0, dx2.y,-dx2.z)).x * dx2.yz;
	u2[11].yz = sampleLinear(tx, x + vec3( 0.0,-dx2.y,-dx2.z)).x * dx2.yz;
	
	float gX = (s[0]-s[1]) + (u3[0].x - u3[7].x) + (u3[6].x - u3[1].x) + (u3[2].x - u3[5].x) + (u3[4].x - u3[3].x) + 
				(u2[0].x - u2[3].x) + (u2[2].x - u2[1].x) + (u2[4].x - u2[7].x) + (u2[6].x - u2[5].x);
	
	float gY = (s[2]-s[3]) + (u3[0].y - u3[7].y) + (u3[1].y - u3[6].y) + (u3[5].y - u3[2].y) + (u3[4].y - u3[3].y) + 
				(u2[0].y - u2[3].y) + (u2[1].y - u2[2].y) + (u2[8].y - u2[11].y) + (u2[10].y - u2[9].y);
	
	float gZ = (s[4]-s[5]) + (u3[0].z - u3[7].z) + (u3[1].z - u3[6].z) + (u3[2].z - u3[5].z) + (u3[3].z - u3[4].z) + 
				(u2[8].z - u2[11].z) + (u2[9].z - u2[10].z) + (u2[4].z - u2[7].z) + (u2[5].z - u2[6].z);
	
	return 0.5*vec3(gX,gY,gZ);
#endif
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
