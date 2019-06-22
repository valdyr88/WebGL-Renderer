//time functions

var appStartTime = -1;
var deltaTime = -1;
var oldFrameTime = -1;
var avgDeltaTime = -1;
var avgFPS = 0;
var currentFrameTime = -1;
/*
performance.now() is in milliseconds
The timestamp is not actually high-resolution. 
To mitigate security threats such as Spectre, browsers currently round the results to varying degrees.
(Firefox started rounding to 1 millisecond in Firefox 60.)
Some browsers may also slightly randomize the timestamp.
The precision may improve again in future releases;
browser developers are still investigating these timing attacks and how best to mitigate them.

treba enejblat getTimeµs() kad browseri pocnu podrzavat to
treba onda zamijenit funkcije sa getTimeµs() na mjestima oznacenim sa : //replace with getTimeµs()
*/

/*
var USECONDS_IN_SECOND = 1000.0 * 1000.0;
var SECONDS_IN_USECOND = 1.0 / (1000.0 * 1000.0);
export function getTimeµs(){ return performance.now(); }
*/
var MSECONDS_IN_SECOND = 1000.0;
var SECONDS_IN_MSECOND = 1.0 / (1000.0);

export function getTimems(){ return performance.now(); }

export function getDeltaSeconds(old_time){
	let current_time = getTimems(); //replace with getTimeµs()
	return (current_time - old_time) * SECONDS_IN_MSECOND; //replace with SECONDS_IN_USECOND
}
export function getSecondsSinceStart(){ return getDeltaSeconds(appStartTime); }
export function getTime(){ return getSecondsSinceStart(); }

export function init(){ 
	appStartTime = getTimems();
	oldFrameTime = appStartTime;
	deltaTime = 1.0/60.0;
	avgDeltaTime = 1.0/60.0;
	avgFPS = 60.0;	
	currentFrameTime = appStartTime;
}//replace with getTimeµs()

export function getAvgDeltaTime(){ return avgDeltaTime; }
export function getDeltaTime(){ return deltaTime; }
export function getAvgFPS(){ return avgFPS; }
export function getFrameTime(){ return currentFrameTime; }

function lerp(a, b, t){ return (1.0-t)*a + t*b; }

export function update(){

	currentFrameTime = getSecondsSinceStart();
	deltaTime = currentFrameTime - oldFrameTime;
	
	if((oldFrameTime > 0.0) && (deltaTime > 1.0/120.0) &&(deltaTime < 1.0)){
		avgDeltaTime = lerp(avgDeltaTime, deltaTime, 1.0/30.0);
		avgFPS = 1.0/avgDeltaTime;
	}
	
	oldFrameTime = currentFrameTime;
	return currentFrameTime;
}