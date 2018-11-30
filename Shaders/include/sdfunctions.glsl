//Signed distance functions
//uglavnom sa stranice https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm

#ifndef GLSL_SDFUNCTIONS
#define GLSL_SDFUNCTIONS

//sd funkcije
//=================================================================================================
float sdf_sphere(float r, vec3 p){
	return length(p)-r;
}

float sdf_box(vec3 b, vec3 p){
  vec3 d = abs(p) - b;
  return length(max(d,0.0))
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf 
}

float sdf_round_box(vec3 b, float r, vec3 p){
  vec3 d = abs(p) - b;
  return length(max(d,0.0)) - r
         + min(max(d.x,max(d.y,d.z)),0.0); // remove this line for an only partially signed sdf 
}

float sdf_torus(vec2 t, vec3 p){
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sdf_cylinder(vec3 c, vec3 p){
  return length(p.xz-c.xy)-c.z;
}

float sdf_cone(vec2 c, vec3 p){
    // c must be normalized
    float q = length(p.xy);
    return dot(c,vec2(q,p.z));
}

float sdf_plane(vec4 n, vec3 p){
  // n must be normalized
  return dot(p,n.xyz) + n.w;
}

float sdf_triangular_prism(vec2 h, vec3 p){
    vec3 q = abs(p);
    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.5);
}

float sdf_capsuleH(vec3 a, vec3 b, float r, vec3 p){
    vec3 pa = p - a, ba = b - a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h ) - r;
}

float sdf_capsuleV(float h, float r, vec3 p){
    p.y -= clamp( p.y, 0.0, h );
    return length( p ) - r;
}

float sdf_cylinder_capped(vec2 h, vec3 p){
	vec2 d = abs(vec2(length(p.xz),p.y)) - h;
	return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdf_ellipsoid(vec3 r, vec3 p){
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}

//=================================================================================================

//combinations
//=================================================================================================
float sdf_union(float a, float b){ return min(a,b); }
float sdf_subtract(float a, float b){ return max(-a,b); }
float sdf_intersect(float a, float b){ return max(a,b); }

float sdf_smooth_union(float a, float b, float k){
	float h = clamp( 0.5 + 0.5*(b-a)/k, 0.0, 1.0);
	return mix(b,a,h) - k*h*(1.0-h);
}
float sdf_smooth_subtract(float a, float b, float k){
	float h = clamp( 0.5 - 0.5*(b+a)/k, 0.0, 1.0);
	return mix(b,-a,h) + k*h*(1.0-h);
}
float sdf_smooth_intersect(float a, float b, float k){
	float h = clamp( 0.5 - 0.5*(b-a)/k, 0.0, 1.0);
	return mix(b,a,h) + k*h*(1.0-h);
}
//=================================================================================================

//transformations (transformira poziciju)
//=================================================================================================
vec3 sdf_repeat(in vec3 p, in vec3 c){ return mod(p,c)-0.5*c; }
vec3 sdf_position(in vec3 p, in vec3 t){ return p - t; }

vec3 sdf_symmetry_x(in vec3 p){ p.x = abs(p.x); return p; }
vec3 sdf_symmetry_xz(in vec3 p){ p.xz = abs(p.xz); return p; }

// #define sdf_scale(function, scale, p) ( function((p)/(scale)))*scale )
// #define sdf_transform(function, op_t, p) ( function ( op_t(p) )
//=================================================================================================

//
//=================================================================================================
// #define sdf_elongate(function, h, p) ( function ( (p) - clamp( (p), -(h), (h) ) ) ) )
vec3 sdf_elongate( in vec3 h, in vec3 p){ return p - clamp(p,-h,h); }
vec3 sdf_elongate2( in vec3 h, in vec3 p){ vec3 q = abs(p)-h; return max(q,0.0) + min(max(q.x,max(q.y,q.z)),0.0); }

float sdf_combine( in float d, in float n){ return min(d,n); } //npr. dist = sdf_combine(dist, sdf_sphere(...));

//=================================================================================================

//http://iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
#define sdf_calc_normal(p, sdf) (normalize( vec3(1.0,-1.0,-1.0)*sdf(p + vec3(1.0,-1.0,-1.0)*1e-4) + \
											vec3(-1.0,-1.0,1.0)*sdf(p + vec3(-1.0,-1.0,1.0)*1e-4) + \
											vec3(-1.0,1.0,-1.0)*sdf(p + vec3(-1.0,1.0,-1.0)*1e-4) + \
											vec3(1.0, 1.0, 1.0)*sdf(p + vec3(1.0, 1.0, 1.0)*1e-4) )) \

/* 
const float h = 1e-4;
const vec2 k = vec2(1.0,-1.0);
return normalize( k.xyy * sdf_map( p + k.xyy*h ) +
				  k.yyx * sdf_map( p + k.yyx*h ) +
				  k.yxy * sdf_map( p + k.yxy*h ) +
				  k.xxx * sdf_map( p + k.xxx*h ) );
*/

#endif //GLSL_SDFUNCTIONS





















































































