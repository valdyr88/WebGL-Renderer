#version 300 es

#define attribut in

attribut vec4 aVertexPosition;
attribut vec3 aVertexNormal;
attribut vec3 aVertexTangent;
attribut vec2 aTexCoords;

uniform mat4 ModelMatrix;
uniform mat4 ViewMatrix;
uniform mat4 ProjectionMatrix;

uniform vec3 CameraPosition;
uniform vec3 CameraForwardDir;
uniform vec3 CameraRightDir;
uniform vec3 CameraUpDir;

uniform float Aspect;
uniform float FOV;

#define varyin out

varyin vec3 PixelPosition;
varyin vec2 TexCoords;
varyin vec3 ViewVector;

void main(void){

	vec4 wPosition = (ModelMatrix * aVertexPosition);
	gl_Position = (ProjectionMatrix * (ViewMatrix * wPosition));
	PixelPosition = gl_Position.xyz / gl_Position.w; PixelPosition = PixelPosition*0.5f + 0.5f;
	
	float d = 1.0f;
	float w = tan(FOV/2.0f); //za d == 1.0f
	float h = w; //za d == 1.0f
	
	ViewVector = d*CameraForwardDir + Aspect*w*aVertexPosition.x*CameraRightDir + h*aVertexPosition.y*CameraUpDir;
	// ViewVector = normalize(ViewVector);
	
	TexCoords = vec2(aTexCoords.x, 1.0-aTexCoords.y);
}
