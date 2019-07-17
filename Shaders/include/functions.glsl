
#ifndef GLSL_FUNCTIONS
#define GLSL_FUNCTIONS

#define float2 vec2
#define float3 vec3
#define float4 vec4
#define int2  ivec2
#define int3  ivec3
#define int4  ivec4
#define bool2 bvec2
#define bool3 bvec3
#define bool4 bvec4
// #define double2 dvec2
// #define double3 dvec3
// #define double4 dvec4
// #define half2 hvec2
// #define half3 hvec3
// #define half4 hvec4
#define inline 
#define frac fract
#define matrix mat4
#define lerp mix
#define ddx dFdx
#define ddy dFdy

#define saturate(x) clamp(x,0.0,1.0)

#define PI (3.14159265359)
#define e  (2.71828182846)
#define FLT_MIN (1.175494351e-38)
#define FLT_MAX (3.402823466e+38)

#define LinearizeDepth(x,n,f) ((2.0 * n) / (f + n - x * (f - n)))
#define LinearizeDepthAndSubtract(b,a,n,f) (LinearizeDepth(b,n,f) - LinearizeDepth(a,n,f))
#define LinearizeDepth2(x,n,f) ((2.0 * n) / (f + lerp(n,f,-x)))
#define LinearizeDepthAndSubtract2(b,a,n,f) (LinearizeDepth2(b,n,f) - LinearizeDepth2(a,n,f))
#define LinearizeZ(z,Near,Far) ( 2.0*Far*Near / ( Far + Near - ( Far - Near ) * ( 2.0*z - 1.0 ) ) )

//================================================================================================================

inline bool float_equals(float a, float b, float eps){ return abs( a-b ) < eps; }
inline bool float_equals(float a, float b){ return float_equals( a, b, 2.0f*FLT_MIN ); }

//================================================================================================================

inline vec4 tovec4(vec3 a, float b){
	return vec4(a.x,a.y,a.z,b);
}
inline vec4 tovec4(float a, vec3 b){
	return vec4(a,b.x,b.y,b.z);
}
inline vec4 tovec4(vec2 a, vec2 b){
	return vec4(a.x,a.y,b.x,b.y);
}
inline vec4 tovec4(float a){
	return vec4(a,a,a,a);
}

inline vec3 tovec3(vec4 a){
	return vec3(a.x,a.y,a.z);
}
inline vec3 tovec3(vec2 a, float b){
	return vec3(a.x,a.y,b);
}
inline vec3 tovec3(float a, vec2 b){
	return vec3(a,b.x,b.y);
}
inline vec3 tovec3(float a){
	return vec3(a,a,a);
}

inline vec2 tovec2(vec4 a){
	return vec2(a.x,a.y);
}
inline vec2 tovec2(vec3 a){
	return vec2(a.x,a.y);
}
inline vec2 tovec2(float a){
	return vec2(a,a);
}

#define tofloat2 tovec2
#define tofloat3 tovec3
#define tofloat4 tovec4

//================================================================================================================

inline float rand(in vec2 co){
	return 2.0*frac(abs(sin(dot(co.xy , vec2(12.9898,78.233))) * 43758.5453))-1.0;
}
inline vec2 randf2(in vec2 co){
	float f1 = frac(abs(sin(dot(co.xy , vec2(12.9898,78.233))) * 43758.5453));
	float f2 = frac(abs(cos(dot(co.yx , vec2(12.9898,78.233))) * 43758.5453));
	return 2.0*vec2(f1,f2)-1.0;
}
inline vec3 randf3(in vec2 co){
	float dot1 = dot(co.xy , vec2(12.9898,78.233));
	float dot2 = dot(co.yx , vec2(2.7182817,42.76908));
	float f1 = frac(abs(cos(dot1) * 43758.5453));
	float f2 = frac(abs(sin(dot1) * 43758.5453));
	float f3 = frac(abs(cos(dot2) * 43758.5453));
	return 2.0*vec3(f1,f2,f3)-1.0;
}
inline vec4 randf4(in vec2 co){
	float dot1 = dot(co.xy , vec2(12.9898,78.233));
	float dot2 = dot(co.yx , vec2(2.7182817,42.76908));
	float f1 = frac(abs(sin(dot1) * 43758.5453));
	float f2 = frac(abs(cos(dot1) * 43758.5453));
	float f3 = frac(abs(sin(dot2) * 43758.5453));
	float f4 = frac(abs(cos(dot2) * 43758.5453));
	return 2.0*vec4(f1,f2,f3,f4)-1.0;
}

//================================================================================================================

inline float gauss(in float b, in vec4 x){
	return 1.0 / pow(b, dot(x,x));
}
inline float gauss(in float b, in vec3 x){
	return 1.0 / pow(b, dot(x,x));
}
inline float gauss(in float b, in vec2 x){
	return 1.0 / pow(b, dot(x,x));
}
inline float gauss(in float b, in float x){
	return 1.0 / pow(b,x*x);
}

//================================================================================================================

float hsl_lightness(vec3 color){
	return (min(min(color.x,color.y),color.z) + max(max(color.x,color.y),color.z)) / 2.0;
}
//================================================================================================================

inline float desaturate(vec3 color)
{
	float luminance = dot(color,vec3(0.299,0.587,0.114)); 
	return luminance;
}

//================================================================================================================
#define sincos(Angle, s, c) s = sin(Angle); c = cos(Angle)
//================================================================================================================

//================================================================================================================

inline matrix MatrixFromEulerAngles(vec3 Angles){
	matrix m;
	vec3 s, c;
	sincos(Angles,s,c);
	m[0][0]=c.y*c.z;	m[1][0]=c.z*s.x*s.y+c.x*s.z;	m[2][0]=-c.x*c.z*s.y+s.x*s.z;	m[3][0] = 0.0;
	m[0][1]=-c.y*s.z;	m[1][1]=c.x*c.z-s.x*s.y*s.z;	m[2][1]=c.z*s.x+c.x*s.y*s.z;	m[3][1] = 0.0;
	m[0][2]=s.y;		m[1][2]=-c.y*s.x;				m[2][2]=c.x*c.y;				m[3][2] = 0.0;
	m[0][3] = 0.0;		m[1][3] = 0.0;					m[2][3] = 0.0;					m[3][3] = 1.0;
	return m;
}
inline matrix getRotationMatrix(in vec3 RotationUp, in vec3 RotationForward){
	matrix m;
	vec3 RotationRight = cross(RotationUp,RotationForward);
	m[0][0]=RotationRight.x;	m[1][0]=RotationUp.x;	m[2][0]=RotationForward.x;	m[3][0] = 0.0;
	m[0][1]=RotationRight.y;	m[1][1]=RotationUp.y;	m[2][1]=RotationForward.y;	m[3][1] = 0.0;
	m[0][2]=RotationRight.z;	m[1][2]=RotationUp.z;	m[2][2]=RotationForward.z;	m[3][2] = 0.0;
	m[0][3] = 0.0;				m[1][3] = 0.0;			m[2][3] = 0.0;				m[3][3] = 1.0;
	return m;
}
inline void ClearTranslation(inout matrix M){
	M[3][0] = 0.0; M[3][1] = 0.0; M[3][2] = 0.0; M[3][3] = 1.0;
}
inline matrix ZeroMatrix(){
	matrix M;
	/* [unroll] */ for(int x = 0; x < 4; ++x) for(int y = 0; y < 4; ++y) M[x][y] = 0.0;
	return M;
}
inline matrix IdentityMatrix(){
	matrix M = ZeroMatrix();
	/* [unroll] */ for(int x = 0; x < 4; ++x) M[x][x] = 1.0;
	return M;
}

inline void getBasisVectors(in matrix M, out vec3 r, out vec3 u, out vec3 f){
	r.x = M[0][0]; r.y = M[0][1]; r.z = M[0][2];
	u.x = M[1][0]; u.y = M[1][1]; u.z = M[1][2];
	f.x = M[2][0]; f.y = M[2][1]; f.z = M[2][2];
}

inline vec3 getTranslation(in matrix M){
	return vec3( M[3][0], M[3][1], M[3][2] );
}

inline matrix getRotationMatrix(in matrix M){
	vec3 r, u, f;
	
	r = M[0].xyz; r = normalize(r);
	u = M[1].xyz; u = normalize(u);
	f = M[2].xyz; f = normalize(f);
	
	matrix m = ZeroMatrix();
	m[0].xyz = r;
	m[1].xyz = u;
	m[2].xyz = f;
	m[2][2] = 1.0;
	
	return m;
}
mat3 CreateRotationMatrix(vec3 r, vec3 u, vec3 f){
	mat3 R;	R[0] = r; R[1] = u; R[2] = f; return R;
}

inline matrix getInverseRotationMatrix(in matrix M){
	matrix m = getRotationMatrix(M);
	
	m[0].xyz = -m[0].xyz;
	m[1].xyz = -m[1].xyz;
	m[2].xyz = -m[2].xyz;
	
	return m;
}

//prima World matricu
matrix getTransformForNormalsMatrix(in matrix W){
/*

- world kopirati,
- clearati translaciju
- izvuci vektore iz stupaca
- izracunati kvadratni length vektora
- konstruirati kvadratnu scale matricu
- vratiti umnozak kvadratnog scalea i kopiranog worlda

*/
	
//clearanje translacije
	ClearTranslation(W);
	
//kvadratni koeficijenti scalea
	vec3 s2; vec3 r, u, f;
	getBasisVectors(W, r, u, f);
	s2.x = dot(r, r);
	s2.y = dot(u, u);
	s2.z = dot(f, f);
	
//inverz koeficijenta
	s2 = 1.0 / s2;
	
//scale matrica
	matrix S2 = IdentityMatrix();
	S2[0][0] = s2.x; S2[1][1] = s2.y; S2[2][2] = s2.z;
	
//vratiti umnozak kvadratnog scalea i kopiranog worlda
	// return mul(S2,W);
	return S2*W;
}

//================================================================================================================

// inline vec2 lerp(vec2 a, vec2 b, float t){ return lerp(a,b,tovec2(t)); }
// inline vec3 lerp(vec3 a, vec3 b, float t){ return lerp(a,b,tovec3(t)); }
// inline vec4 lerp(vec4 a, vec4 b, float t){ return lerp(a,b,tovec4(t)); }

//================================================================================================================

inline vec4 baryc(vec4 a, vec4 b, vec4 c, vec3 t){
	vec4 v = vec4(0.0);
	v = t.x * a + t.y * b + t.z * c;
	return v;
}
inline vec3 baryc(vec3 a, vec3 b, vec3 c, vec3 t){
	vec3 v = vec3(0.0);
	v = t.x * a + t.y * b + t.z * c;
	return v;
}
inline vec2 baryc(vec2 a, vec2 b, vec2 c, vec3 t){
	vec2 v = vec2(0.0);
	v = t.x * a + t.y * b + t.z * c;
	return v;
}
inline float baryc(float a, float b, float c, vec3 t){
	float v = float(0.0);
	v = t.x * a + t.y * b + t.z * c;
	return v;
}

//================================================================================================================

inline float saturate2(float x, float l){
	float ix = 1.0 - l*x;
	return x * ix*ix;
}
inline vec3 saturate2(vec3 x, float l){
	float s = saturate2(desaturate(x),l);
	return s * x;
}
inline vec4 saturate2(vec4 x, float l){
	float s = saturate2(desaturate(x.xyz),l);
	return vec4(s*x.xyz, x.a);
}

//================================================================================================================

inline vec3 halfvec(in vec3 a, in vec3 b){
	return -normalize(0.5*(a - b) - a);
}
inline vec4 reflectvec(in vec3 ray, in vec3 normal){
	vec4 v = vec4(0.0,0.0,0.0, dot(ray,normal));
	v.xyz = ray - 2.0*v.a*normal;//minus je jer je dot(ray,normal) negativan, tj ray i normal su suprotno orjentirani
	return v;
}

//================================================================================================================

inline vec3 fresnel(in vec3 f0, in float dotProduct){
	//return lerp(f0, tovec3(1.0f), pow(1.0001f - dotProduct, 5.0f));
	//float m = 1.0f - dotProduct; float m2 = m*m; float m5 = m2*m2*m;
	return f0 + (1.0 - f0)*pow(1.0 - dotProduct, 5.0);
}
inline vec3 fresnel(in float f0, in float dotProduct){ return fresnel(tovec3(f0), dotProduct); }

inline vec3 fresnel(in vec3 f0, in vec3 view, in vec3 ray){
	return fresnel(f0, dot(halfvec(view,ray), view));
}
inline vec3 fresnel(in float f0, in vec3 view, in vec3 ray){ return fresnel(tovec3(f0), view, ray); }

inline vec3 fresnel(in vec3 f0, in float dotProduct, in float roughness){ //Schlick fresnel with roughness
	return f0 + (max( tovec3(1.0 - 0.5*roughness), f0) - f0) * pow(1.0 - dotProduct, 5.0);
	// return fresnel(f0, dotProduct);
}
inline vec3 fresnel(in float f0, in float dotProduct, in float roughness){ return fresnel(tovec3(f0), dotProduct, roughness); }

//================================================================================================================

inline void excg(inout float a, inout float b){
	float tmp = a; a = b; b = tmp;}
inline void excg(inout vec2 a, inout vec2 b){
	vec2 tmp = a; a = b; b = tmp;}
inline void excg(inout vec3 a, inout vec3 b){
	vec3 tmp = a; a = b; b = tmp;}
inline void excg(inout vec4 a, inout vec4 b){
	vec4 tmp = a; a = b; b = tmp;}

/* inline void excg(inout double a, inout double b){
	double tmp = a; a = b; b = tmp;}
inline void excg(inout double2 a, inout double2 b){
	double2 tmp = a; a = b; b = tmp;}
inline void excg(inout double3 a, inout double3 b){
	double3 tmp = a; a = b; b = tmp;}
inline void excg(inout double4 a, inout double4 b){
	double4 tmp = a; a = b; b = tmp;}
*/

/* inline void excg(inout half a, inout half b){
	half tmp = a; a = b; b = tmp;}
inline void excg(inout half2 a, inout half2 b){
	half2 tmp = a; a = b; b = tmp;}
inline void excg(inout half3 a, inout half3 b){
	half3 tmp = a; a = b; b = tmp;}
inline void excg(inout half4 a, inout half4 b){
	half4 tmp = a; a = b; b = tmp;}
*/

inline void excg(inout int a, inout int b){
	int tmp = a; a = b; b = tmp;}
inline void excg(inout int2 a, inout int2 b){
	int2 tmp = a; a = b; b = tmp;}
inline void excg(inout int3 a, inout int3 b){
	int3 tmp = a; a = b; b = tmp;}
inline void excg(inout int4 a, inout int4 b){
	int4 tmp = a; a = b; b = tmp;}

/* inline void excg(inout uint a, inout uint b){
	uint tmp = a; a = b; b = tmp;}
inline void excg(inout uint2 a, inout uint2 b){
	uint2 tmp = a; a = b; b = tmp;}
inline void excg(inout uint3 a, inout uint3 b){
	uint3 tmp = a; a = b; b = tmp;}
inline void excg(inout uint4 a, inout uint4 b){
	uint4 tmp = a; a = b; b = tmp;}
*/

inline void excg(inout bool a, inout bool b){
	bool tmp = a; a = b; b = tmp;}
inline void excg(inout bool2 a, inout bool2 b){
	bool2 tmp = a; a = b; b = tmp;}
inline void excg(inout bool3 a, inout bool3 b){
	bool3 tmp = a; a = b; b = tmp;}
inline void excg(inout bool4 a, inout bool4 b){
	bool4 tmp = a; a = b; b = tmp;}

//================================================================================================================

inline vec3 powerblendcolor(float value, vec3 color){
	return pow( vec3(value,value,value), 2.0*(1.0 - color.xyz) + 1.0);
}

//================================================================================================================

inline float rim(in vec3 normal, in vec3 view, in float size, in float offset, in float contrast){
	float adotNV = abs(dot(normal,view)); if(adotNV > 0.9999) adotNV = 0.9999;
	return contrast*saturate( pow(1.0-adotNV, 1.0 / size) + offset );
}
inline float rim(in vec3 normal, in vec3 view, in float size, in float offset){
	return rim(normal,view,size,offset,1.0);
}
inline float rim(in vec3 normal, in vec3 view, in float size){
	return rim(normal,view,size,0.0,1.0);
}

//================================================================================================================

inline float linef(float x, float k, float o){
	return k*x + o;
}

//================================================================================================================

inline int powi(const int b, const int ex){
	int v = b;
	for(int i = 1; i < 100; ++i){ 
		if(i >= ex) break;
		v = v*b;
	}
	return v;
}
//================================================================================================================

/*inline bool getbit(int bits, const int bitno, const int nofbits){
	int bitpow = nofbits - (bitno+1);
	bits = bits * powi(2, bitpow);
	bits = bits / powi(2, nofbits-1);
	return bits != 0;
}*/
inline bool getbit(int bits, const int bitno, const int nofbits){
	int bitmask = 1<<bitno;
	return (bits & bitmask) != 0;
}
#define uint_getbit(bits, bitno) getbit(bits, bitno, 32)

//================================================================================================================

//uzeto sa https://www.opengl.org/discussion_boards/showthread.php/162816-frexp
inline float frexp(float x, out float ex){
   ex = ceil(log2(x));
   return(x * exp2(-ex));
}
//================================================================================================================

inline vec4 hdr_encode(vec3 rgb, float scale, float offset){
	rgb = (rgb - tovec3(offset)) * scale;
	
	float fmin = min(min(rgb.r,rgb.g),rgb.b);
	float fmax = max(max(rgb.r,rgb.g),rgb.b);
	float exponent = 1.0;
	
	if(fmax < 1e-32) return vec4(0.0f,0.0f,0.0f,0.0f);
	fmax = frexp(fmax, exponent) * 256.0f / fmax;
	
	rgb = rgb * fmax;
	return vec4(rgb.r, rgb.g, rgb.b, exponent + 128.0f);
}
inline vec4 hdr_encode(vec3 rgb){ return hdr_encode(rgb, 1.0f, 0.0f); }

inline vec3 hdr_decode(vec4 rgbe, float scale, float offset){	
	if(rgbe.a == 0.0f) return vec3(0.0f,0.0f,0.0f);
	
	// float scale = ldexp(1.0f, rgbe.a - (128.0f+8.0f));
	float mult = pow(2.0f, rgbe.a - 128.0f);
	vec3 rgb = vec3(rgbe.r, rgbe.g, rgbe.b) * mult / 256.0f;
	
	rgb = (rgb / scale) + tovec3(offset);
	return rgb;
}
inline vec3 hdr_decode(vec4 rgbe){ return hdr_decode(rgbe, 1.0f, 0.0f); }

//================================================================================================================

inline float gamma(float v, float g){ return pow(v,g); }
inline vec2 gamma(vec2 v, vec2 g){ return pow(v,g); }
inline vec3 gamma(vec3 v, vec3 g){ return pow(v,g); }
inline vec4 gamma(vec4 v, vec4 g){ return pow(v,g); }
inline vec2 gamma(vec2 v, float g){ return pow(v,tovec2(g)); }
inline vec3 gamma(vec3 v, float g){ return pow(v,tovec3(g)); }
inline vec4 gamma(vec4 v, float g){ return pow(v,tovec4(g)); }

//================================================================================================================

//https://stackoverflow.com/questions/22360810/reconstructing-world-coordinates-from-depth-buffer-and-arbitrary-view-projection
vec3 PositionFromDepth(in vec2 texCoord, in float depth, in mat4 InvVPMat){
	vec4 clipSpaceLocation;
	clipSpaceLocation.xy = 2.0f*texCoord - 1.0f;
	clipSpaceLocation.z = 2.0f*depth - 1.0f;
	clipSpaceLocation.w = 1.0f;
	vec4 homogenousLocation = InvVPMat * clipSpaceLocation;
	return homogenousLocation.xyz / homogenousLocation.w;
}
//================================================================================================================

//map3d2d() - Created by inigo quilez - iq. returns: xy - tex coord, z - smoothstep for lerping. 
vec3 map3d2d(in vec3 x, const in vec2 sz, const in float bias, const in float div ){
	vec3 p = floor(x); vec3 f = fract(x);
	f = f*f*(3.0-2.0*f); //smoothstep
	vec2 uv = (p.xy+sz.xy*p.z) + f.xy;
	uv = (uv+bias)/div;
	return vec3(uv.x,uv.y,f.z);
}
//map3d2d() - Created by inigo quilez - iq
vec3 map3d2d(in vec3 x){ return map3d2d(x, vec2(37.0,17.0), 0.5, 256.0); }

//================================================================================================================

vec4 lerp3pt(vec4 a, vec4 b, vec4 c, float t){
	t = 2.0*t-1.0;
	if(t < 0.0) return lerp(a,b,1.0+t);
	else return lerp(b,c,t);
}

//================================================================================================================

bool intersectRaySphere(const vec3 rPos, const vec3 rDir, const vec3 sphPos, const float sphRad, out float2 t)
{	
	float a = 1.0; 
	vec3 rPos2sphPos = rPos - sphPos;
	float b = 2.0*dot(rDir, rPos2sphPos);
	float c = dot(rPos2sphPos,rPos2sphPos) - sphRad*sphRad;
	float D = b*b - 4.0*a*c;
	
	if(D < 0.0) return false;
	if(D == 0.0){ t = float2(b / 2.0*a); return true; }
	
	float sqrtD = sqrt(D);	
	
	float t1 = (b - sqrtD) / 2.0*a;
	float t2 = (b + sqrtD) / 2.0*a;
	
	t.x = t1; t.y = t2;
	
	return true;
}

//https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
bool intersectRayBBox(const vec3 pos, const vec3 dir, const vec3 boxMin, const vec3 boxMax, out vec2 hit) {
	
	vec3 rinvDir = vec3(1.0/dir);

	vec3 tbot = rinvDir * (boxMin - pos);
	vec3 ttop = rinvDir * (boxMax - pos);
	vec3 tmin = min(ttop, tbot);
	vec3 tmax = max(ttop, tbot);
	vec2 t = max(tmin.xx, tmin.yz);
	float t0 = max(t.x, t.y);
	t = min(tmax.xx, tmax.yz);
	float t1 = min(t.x, t.y);
	hit.x = t0;
	hit.y = t1;
	
	return t1 > max(t0, 0.0);
}

//================================================================================================================

#endif //GLSL_FUNCTIONS
