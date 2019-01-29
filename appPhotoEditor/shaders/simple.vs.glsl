#version 300 es

#define attribut in

attribut vec4 aVertexPosition;
attribut vec2 aTexCoords;

#define varyin out

varyin vec2 TexCoords;

void main(void){

	gl_Position = aVertexPosition; gl_Position.z = 0.0f; gl_Position.a = 1.0f;
	TexCoords = vec2(aTexCoords.x, aTexCoords.y);
}