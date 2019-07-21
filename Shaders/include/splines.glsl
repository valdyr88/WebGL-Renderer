
#ifndef GLSL_SPLINES
#define GLSL_SPLINES

//------------------------------------------------------------------------------

mat4 mCubeBezier_B = mat4(	-1.0, 3.0,-3.0, 1.0,
							 3.0,-6.0, 3.0, 0.0,
							-3.0, 0.0, 3.0, 0.0,
							 1.0, 4.0, 1.0, 0.0 );

mat3x4 mCubeBezier_dB = mat3x4( -1.0, 2.0, -1.0,
								 3.0,-4.0,  0.0,
								-3.0, 2.0,  1.0,
								 1.0, 0.0,  0.0 );

vec3 bezier_curve(float t, float f, mat4 B, mat4x3 R){
	float t3 = t*t*t, t2 = t*t; vec4 p = vec4(0.0);
	
	p = f*(t3*B[0] + t2*B[1] + t*B[2] + B[3]);
	return p.x*R[0] + p.y*R[1] + p.z*R[2] + p.w*R[3];
}
vec3 bezier_curve(float t, float f, mat4x3 R){ return bezier_curve(t, f, mCubeBezier_B, R); }
vec3 bezier_curve(float t, mat4x3 R){ return bezier_curve(t, 1.0/6.0, R);}

vec3 bezier_tangent(float t, float f, mat3x4 B, mat4x3 R){
	float t2 = t*t; vec4 dp = vec4(0.0);
	
	dp = f*(t2*B[0] + t*B[1] + B[2]);
	return dp.x*R[0] + dp.y*R[1] + dp.z*R[2] + dp.w*R[3];
}
vec3 bezier_tangent(float t, float f, mat4x3 R){ return bezier_tangent(t, f, mCubeBezier_dB, R); }
vec3 bezier_tangent(float t, mat4x3 R){ return bezier_tangent(t, 1.0/2.0, R); }

//------------------------------------------------------------------------------

mat4 mICubeBezier_B = ( mat4( 18.0, 0.0, 0.0, 0.0,
						   -33.0, 54.0, -27.0, 6.0,
						    21.0, -81.0, 81.0, -21.0,
							-6.0, 27.0, -54.0, 33.0 ) );

vec3 ibezier_curve(float t, float f, mat4 B, mat4x3 P){
	float t3 = t*t*t, t2 = t*t;
	
	mat4x3 a = f * (P * B);
	return a[0] + (3.0*t - 3.0*t2 + t3)*a[1] + (3.0*t2 - 2.0*t3)*a[2] + t3*a[3];
}
vec3 ibezier_curve(float t, float f, mat4x3 P){ return ibezier_curve(t, f, mICubeBezier_B, P); }
vec3 ibezier_curve(float t, mat4x3 P){ return ibezier_curve(t, 1.0/18.0, P); }

mat4x3 ibezier_curve_getAmatrix(float f, mat4 B, mat4x3 P){ return f * (P * B); }
mat4x3 ibezier_curve_getAmatrix(mat4x3 P){ return ibezier_curve_getAmatrix(1.0/18.0, mICubeBezier_B, P); }

#endif //GLSL_SPLINES

