import * as glMatrix from "./gl-matrix/common.js";
import * as mat2 from "./gl-matrix/mat2.js";
import * as mat2d from "./gl-matrix/mat2d.js";
import * as mat3 from "./gl-matrix/mat3.js";
import * as mat4 from "./gl-matrix/mat4.js";
import * as quat from "./gl-matrix/quat.js";
import * as quat2 from "./gl-matrix/quat2.js";
import * as vec2 from "./gl-matrix/vec2.js";
import * as vec3 from "./gl-matrix/vec3.js";
import * as vec4 from "./gl-matrix/vec4.js";

export function deg2rad(deg){ return deg*(Math.PI/180.0); }
export function rad2deg(rad){ return rad*(180.0/Math.PI); }

/*
	Spherical to cartesian coordinates, s - azimuth, t - inclination, r - radius
	s = [0.0, 2.0*PI), t = [0.0, PI], r = [0.0, inf)
*/
export function sph2cart3D(s,t,r){
	s = deg2rad(s); t = deg2rad(t);
	
	var sint = Math.sin(t);
	var sins = Math.sin(s);
	var cost = Math.cos(t);
	var coss = Math.cos(s);

	/* 
	x = r * cos(s) * sin(t)
	y = r * sin(s) * sin(t)
	z = r * cos(t)
	
	var x = r * coss * sint;
	var y = r * sins * sint;
	var z = r * cost;
	 */
	
	var x = r * sint * coss;
	var y = r * sint * sins;
	var z = r * cost;
	
	return [x,y,z];
}

/*
 check for equality between a and b within error margin e
*/
export function floatEqual(a,b,e){
	return Math.abs(a-b) < e;
}

/*
 lerp 
*/
export function lerp(a,b,t){
	return a*(1.0-t)+b*t;
}

export { glMatrix, mat2, mat2d, mat3, mat4, quat, quat2, vec2, vec3, vec4 };