import * as vMath from "../glMatrix/gl-matrix.js";

/*
	interpolating points with splines
*/

function getvMathVecLib(T){
	if(T.length == 2) return vMath.vec2;
	else if(T.length == 3) return vMath.vec3;
	else if(T.length == 4) return vMath.vec4;
	return null;
}

function getDirAndDist(A, B){
	let vMathVecLib = getvMathVecLib(A);
	let N = [...A];
	vMathVecLib.subtract(N, B, A);
	let len = vMathVecLib.length(N);
	vMathVecLib.scale(N, N,1.0/len);
	return [N, len];
}

function scaleEndPoint(A, B, dist){
	let vMathVecLib = getvMathVecLib(A);
	let N = [...A];
	vMathVecLib.subtract(N, B, A);
	vMathVecLib.normalize(N, N);
	vMathVecLib.scaleAndAdd(N, A,N,dist);
	return N;
}

//interpolated cubic Bezier
//-----------------------------------------------------------------------------

var matICubeBezier_B = vMath.mat4.fromValues(	18.0, 0.0, 0.0, 0.0,
											   -33.0, 54.0, -27.0, 6.0,
												21.0, -81.0, 81.0, -21.0,
												-6.0, 27.0, -54.0, 33.0 );

export function ICubicBezier(t, P){
	let t3 = t*t*t; let t2 = t*t;
	
	let B = matICubeBezier_B;
	
	let f = 1.0/18.0;
	let a = vMath.mat4x3.create();
	vMath.mat4x3.mul_4x3by4x4(a, P,B);
	
	var a0 = [0,0,0]; let a1 = [0,0,0], a2 = [0,0,0], a3 = [0,0,0];
	vMath.mat4x3.getRows(a0,a1,a2,a3, a);
	
	// let T0 = 1.0;
	let T1 = (3.0*t - 3.0*t2 + t3);
	let T2 = (3.0*t2 - 2.0*t3);
	// let T3 = t3;
	
	vMath.vec3.scaleAndAdd(a0, a0,a1,T1);
	vMath.vec3.scaleAndAdd(a0, a0,a2,T2);
	vMath.vec3.scaleAndAdd(a0, a0,a3,t3);
	
	return a0;
}

//cubic Bezier
//-----------------------------------------------------------------------------

export function CubicBezier(t, P0, P1, P2, P3, vMathVecLib){
	let t2 = t*t; let t3 = t2*t;
	let omt = 1.0-t; let omt2 = omt*omt; let omt3 = omt2*omt;
	
	let B0 = omt3;
	let B1 = 3.0*t*omt2;
	let B2 = 3.0*t2*omt;
	let B3 = t3;
	
	if(vMathVecLib == undefined || vMathVecLib == null)
		vMathVecLib = getvMathVecLib(P0);
	let Pt = vMathVecLib.create();
	
	vMathVecLib.scaleAndAdd(Pt, Pt,P0,B0);
	vMathVecLib.scaleAndAdd(Pt, Pt,P1,B1);
	vMathVecLib.scaleAndAdd(Pt, Pt,P2,B2);
	vMathVecLib.scaleAndAdd(Pt, Pt,P3,B3);
	
	return Pt;
}

export function CubicBezier_getControlPointToMatchFirstDerivative(P0, P1, P2, P3, Q3){
	//Q1 = 2.0*P3 - P2
	
	let vMathVecLib = getvMathVecLib(P2);
	let Q1 = vMathVecLib.create();
	
	vMathVecLib.scale(Q1, P3,2.0);
	vMathVecLib.subtract(Q1, Q1,P2);
	
	return Q1;
}

export function CubicBezier_getControlPointToMatchSecondDerivative(P0, P1, P2, P3, Q1, Q3){
	//Q2 = 4.0*P3-4.0*P2+P1
	
	let vMathVecLib = getvMathVecLib(P1);
	let Q2 = vMathVecLib.create();
	
	vMathVecLib.scaleAndAdd(Q2, P1,P2,-4.0);
	vMathVecLib.scaleAndAdd(Q2, Q2,P3, 4.0);
	
	return Q2;
}

export function CubicBezier_ScaleMiddleControlPoints(Q0, Q1, Q2, Q3){
	let vecN = getvMathVecLib(Q0);
	// let Nlen = getDirAndDist(Q0, Q3);
	// let thirdLen = Nlen[1] / 3.0;
	
	//potrebno je sacuvati omjer udaljenosti Q1Q0 i Q2Q0!
	//za Q1 -> scaleEndPoint(Q0,Q1,dist(Q0,Q1)/dist(Q0,Q2)*dist/3.0);
	let dist = vecN.distance(Q0,Q3);
	let distQ0Q1 = vecN.distance(Q0,Q1);
	let distQ0Q2 = vecN.distance(Q0,Q2);
	
	Q1 = scaleEndPoint(Q0,Q1,(distQ0Q1/distQ0Q2)*dist/3.0);
	Q2 = scaleEndPoint(Q0,Q2,2.0*dist/3.0);
	
	return [Q1,Q2];
}


export function CubicBezier_ScaleFirstControlPoint(Q0, Q1, Q3, value){
	if(value == undefined || value == null) value = 0.5;
	let vecN = getvMathVecLib(Q0);
	
	let dist = vecN.distance(Q0,Q3);
	let distQ0Q1 = vecN.distance(Q0,Q1);
	
	// Q1 = scaleEndPoint(Q0, Q1, (dist*value));
	Q1 = vecN.lerp(Q1, Q0, Q1, value*(dist/distQ0Q1));
	return Q1;
}

export function CubicBezier_CalcSecondControlPoint(Q0, Q1, Q3, value){
	if(value == undefined || value == null) value = 0.75;
	let vecN = getvMathVecLib(Q0);
	
	let Q2 = vecN.create();
	Q2 = vecN.lerp(Q2, Q1, Q3, value);
	
	return Q2;
}

// generate interpolated points
//-----------------------------------------------------------------------------

function getNormalizedLine(A,B,vMathVecLib){
	let rtn = vMathVecLib.create();
	vMathVecLib.subtract(rtn, B,A);
	vMathVecLib.normalize(rtn, rtn);
	return rtn;
}

export function CubicBezier_GenerateInterpolatedPoints(
							P0, P1, P2, P3, 
							initialDeltaT, minimalDeltaT, maxAngle, maxDistance)
{	
	let cosMaxAngle = Math.cos(vMath.deg2rad(maxAngle));
	let vMathVecLib = getvMathVecLib(P0);
	
	let dT = initialDeltaT;
	let t = 0.0;
	
	let Pt = CubicBezier(dT, P0, P1, P2, P3, vMathVecLib);
	let Pts = [vMathVecLib.clone(P0),Pt];
	
	let prevLine = getNormalizedLine(P0, Pt, vMathVecLib);
	
	let i = 0;
	
	for(t = 2.0*dT; t < 1.0; t += dT){
		Pt = CubicBezier(t, P0, P1, P2, P3, vMathVecLib);
		let pPt = Pts[Pts.length-1];
		
		let line = getNormalizedLine(pPt, Pt, vMathVecLib);
		let lineLengthSquared = vMathVecLib.squaredLength(line);
		if(lineLengthSquared < 0.99 || lineLengthSquared > 1.01){
			dT = 1.2*initialDeltaT; continue; }
		let cosAngle = vMathVecLib.dot(line, prevLine); //aligment between lines
		let dist = vMathVecLib.distance(pPt, Pt);
		
		if((cosAngle > cosMaxAngle) && (dist < maxDistance)/*  && (dist >= minDistance) */){
			Pts[Pts.length] = Pt;
			prevLine = line; //store current line for next iteration
			dT *= 1.2;
		}
		/* else if((dist < minDistance) && !(cosAngle > cosMaxAngle)){ //increase dist
			t -= dT; //track back
			dT *= 2.0;
		} */
		else{ //conditions don't hold, half the dT and try again
			if(dT < minimalDeltaT){ //but if dT is low, then just store point and move on...
				Pts[Pts.length] = Pt;
				dT = minimalDeltaT;
				prevLine = line; //store current line for next iteration
			}
			else{
				t -= dT; //track back
				dT *= 0.5; //half the step
			}
		}
		++i;// if(i > 1000) break;
	}
	
	console.log("GenerateInterpolatedPoints() : " + (Pts.length-1)/i + ", " + (Pts.length-1));
	
	Pts[Pts.length] = vMathVecLib.clone(P3);
	return Pts;
}
//-----------------------------------------------------------------------------
