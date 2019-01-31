
layout (std140) uniform ubBrush
{
	vec4 position_rotation; //[x,y] - position, [z,w] - rotation
	vec4 color; //[r,g,b,a] - color
	vec4 offset_dt_time; //[x,y] - offset, z - dt, w - time
	
} Brush;

