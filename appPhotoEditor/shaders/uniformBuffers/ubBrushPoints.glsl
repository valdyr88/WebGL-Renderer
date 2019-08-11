
#ifndef PHAPP_BRUSHPOINTS
#define PHAPP_BRUSHPOINTS

#define MAX_BRUSH_POINTS 256

uniform int BrushPointCount;
uniform vec2 BrushPoints[MAX_BRUSH_POINTS];
uniform int BrushPointsFlags;

bool sBrushPoints_getSegmentPoints(int id, out vec2 a, out vec2 b){
	if(id >= 0 && id < MAX_BRUSH_POINTS-1 && id < BrushPointCount-1){
		a = BrushPoints[id]; b = BrushPoints[id+1]; return true;
	}
	return false;
}
bool sBrushPoints_getFirstAndLastPoint(out vec2 a, out vec2 b){
	if(BrushPointCount <= 1) return false;
	a = BrushPoints[0]; b = BrushPoints[BrushPointCount-1]; return true;
}
bool sBrushPoints_getFirstPoint(out vec2 a){
	if(BrushPointCount <= 0) return false;
	a = BrushPoints[0]; return true;
}
bool sBrushPoints_getLastPoint(out vec2 b){
	if(BrushPointCount <= 1) return false;
	b = BrushPoints[BrushPointCount-1]; return true;
}

#endif //PHAPP_BRUSHPOINTS
