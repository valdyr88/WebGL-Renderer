
#ifndef PHAPP_SBRUSH
#define PHAPP_SBRUSH

struct sBrush{
	vec4 position_rotation; //[x,y] - position, [z,w] - rotation
	vec4 color; //[r,g,b,a] - color
	vec4 offset_dt_rand; //[x,y] - offset, z - dt, w - random
	vec3 scale_intensity; //[x,y] - scale, z - intensity
	int  flags;
};

layout (std140) uniform ubBrush
{
	sBrush data;
} Brush;

vec2 sBrush_getPosition(sBrush brush){ return brush.position_rotation.xy; }
vec2 sBrush_getPosition(){ return sBrush_getPosition(Brush.data); }
vec2 sBrush_getRotation(sBrush brush){ return brush.position_rotation.zw; }
vec2 sBrush_getRotation(){ return sBrush_getRotation(Brush.data); }
vec4 sBrush_getColor(sBrush brush){ return brush.color; }
vec4 sBrush_getColor(){ return sBrush_getColor(Brush.data); }
vec2 sBrush_getOffset(sBrush brush){ return brush.offset_dt_rand.xy; }
vec2 sBrush_getOffset(){ return sBrush_getOffset(Brush.data); }
float sBrush_getdTime(sBrush brush){ return brush.offset_dt_rand.z; }
float sBrush_getdTime(){ return sBrush_getdTime(Brush.data); }
float sBrush_getRandom(sBrush brush){ return brush.offset_dt_rand.w; }
float sBrush_getRandom(){ return sBrush_getRandom(Brush.data); }
vec2 sBrush_getScale(sBrush brush){ return brush.scale_intensity.xy; }
vec2 sBrush_getScale(){ return sBrush_getScale(Brush.data); }
float sBrush_getIntensity(sBrush brush){ return brush.scale_intensity.z; }
float sBrush_getIntensity(){ return sBrush_getIntensity(Brush.data); }

#define sBrushFlags_bitmask_isPressed (1<<31)
#define sBrushFlags_bitmask_isStrokeStart (1<<0)
#define sBrushFlags_bitmask_isStrokeEnd (1<<1)

bool sBrush_isPressed(sBrush brush){ return (brush.flags & sBrushFlags_bitmask_isPressed) != 0; }
bool sBrush_isPressed(){ return sBrush_isPressed(Brush.data); }
bool sBrush_isStrokeStart(sBrush brush){ return (brush.flags & sBrushFlags_bitmask_isStrokeStart) != 0; }
bool sBrush_isStrokeStart(){ return sBrush_isStrokeStart(Brush.data); }
bool sBrush_isStrokeEnd(sBrush brush){ return (brush.flags & sBrushFlags_bitmask_isStrokeEnd) != 0; }
bool sBrush_isStrokeEnd(){ return sBrush_isStrokeEnd(Brush.data); }	

#endif //PHAPP_SBRUSH
