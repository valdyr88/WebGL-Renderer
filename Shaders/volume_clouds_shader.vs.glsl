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
uniform vec3 CameraForward;
uniform vec3 CameraRight;
uniform vec3 CameraUp;
uniform float PixelAspect;

#define varyin out

varyin vec3 Normal;
varyin vec3 Tangent;
varyin vec3 Bitangent;
varyin vec3 PixelPosition;
varyin vec2 TexCoords;
varyin vec3 Position;
varyin vec3 ViewVector;

void main(void)
{
	gl_Position = aVertexPosition;
	PixelPosition = gl_Position.xyz / gl_Position.w; 
	PixelPosition = PixelPosition*0.5f + 0.5f;
	
	Position = 2.0 * CameraForward +
			-PixelAspect * aVertexPosition.x * CameraRight +
			aVertexPosition.y * CameraUp + CameraPosition;
	
	ViewVector = Position - CameraPosition;
	
	Normal = normalize((ModelMatrix * vec4(aVertexNormal,0.0))).xyz;
	Tangent = normalize((ModelMatrix * vec4(aVertexTangent,0.0))).xyz;
	Bitangent = normalize(cross(Tangent, Normal));
	
	TexCoords = vec2(aTexCoords.x, 1.0-aTexCoords.y);
}
