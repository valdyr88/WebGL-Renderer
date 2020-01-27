import { gl, glPrintError, CGLExtObject } from "./glContext.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { CShader, CUniformBlockBuffer, CUniformBlockBinding } from "./glShader.js";
import { CFramebuffer } from "./glFramebuffer.js";

var PointShader = -1;

function InitPointShader(){
	if(PointShader != -1) return true;
	
	PointShader = new CShader(-1);
	
	var vsCode = 
	"#version 300 es\n\
	in vec4 aVertexPosition;\n\
	uniform mat4 ViewMatrix;\n\
	uniform mat4 ProjectionMatrix;\n\
	uniform float PointSize;\n\
	uniform vec3 VertexPosition;\n\
	uniform int flags;\n\
	out vec3 oaVertexPosition;\n\
	\n \
	#define LightType_Point 1\n \
	#define LightType_Direction 2\n \
	#define LightType_Spot 3\n \
	#define getLightType(f) ((f) >> 29)\n \
	\n \
	void main(void){ \n\
		gl_Position = ((getLightType(flags) == LightType_Direction)? vec4(normalize(VertexPosition.xyz),0.0f) : vec4(VertexPosition.xyz,1.0f));\n\
		gl_Position = (ViewMatrix * gl_Position);\n\
		gl_Position = (ProjectionMatrix * gl_Position);\n\
		if(getLightType(flags) == LightType_Direction) gl_Position.z = 0.99999f*gl_Position.w;\n\
		gl_PointSize = PointSize;\n\
		oaVertexPosition = aVertexPosition.xyz;\n\
	}\
	";
	
	var fsCode =
	"#version 300 es\n\
	precision mediump float;\n\
	uniform vec4 Color;\n\
	out vec4 glFragColor;\n\
	\n\
	void main(void){\n\
		glFragColor = Color;\n\
	}\
	";
	if(PointShader.Compile(vsCode, fsCode) == false) return false;
	PointShader.setVertexAttribLocations("aVertexPosition");
	PointShader.ULPointSize = PointShader.getUniformLocation("PointSize");
	PointShader.setTransformMatricesUniformLocation(null,"ViewMatrix","ProjectionMatrix");
	PointShader.ULColor = PointShader.getUniformLocation("Color");
	PointShader.ULPosition = PointShader.getUniformLocation("VertexPosition");
	PointShader.ULFlags = PointShader.getUniformLocation("flags");
	
	return true;
}

export var MAX_LIGHTS = 1;

export class CLight extends CGLExtObject{
	
	constructor(slotID){
		super();
		this.SlotID = slotID;
		this.Position = vMath.vec4.create();
		this.Intensity = 1.0;
		this.Color = vMath.vec4.create();
		this.DisplaySize = 10.0;
		this.DisplayColor = vMath.vec4.create();
		this.flags = 0;
		this.glVertexBuffer = -1;
		this.UniformBlock = null;
		
		InitPointShader();
		this.CreatePointBuffer();
		this.CreateUniformBlock();
		
		this.bNeedsToUpdateUniformBlock = true;
	}
	
	/*
		struct CLight{
			vec4 position;			//1
			vec4 color;				//2
			float intensity;		//3
			int flags;
		};
	*/
	
	SerializeToUniformBlock(){
		var FloatUint8 = CUniformBlockBuffer.ConvertTypedArray( new Float32Array([this.Position[0],this.Position[1],this.Position[2],this.Position[4],
																				  this.Color[0],this.Color[1],this.Color[2],this.Color[3],this.Intensity]), Uint8Array );
		var IntUint8 =   CUniformBlockBuffer.ConvertTypedArray( new Uint32Array([this.flags, 0, 0]), Uint8Array );
		
		var i = 0;
		for(var b = 0; b < FloatUint8.length; ++b){
			this.UniformBlock.data[i] = FloatUint8[b]; ++i; }
		for(var b = 0; b < IntUint8.length; ++b){
			this.UniformBlock.data[i] = IntUint8[b]; ++i; }
	}
	
	CreateUniformBlock(){		
		if(this.UniformBlock != null) return;
		
		this.UniformBlock = new CUniformBlockBuffer();
		this.UniformBlock.Create(3);
	}
	
	UpdateUniformBlock(){
		if(this.bNeedsToUpdateUniformBlock == false) return;
		this.SerializeToUniformBlock();
		this.UniformBlock.Update();
		this.bNeedsToUpdateUniformBlock = false;
	}
	
	CreatePointBuffer(){
		
		this.glVertexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0, 0.0, 0.0]), gl.STATIC_DRAW);
		this.glVertexBuffer.itemSize = 3;
		this.glVertexBuffer.numItems = 1;
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
	
	Update(){
		this.UpdateUniformBlock();
	}
	
	setMatrices(View, Projection)
	{
		PointShader.setViewMatrixUniform(View);
		PointShader.setProjectionMatrixUniform(Projection);
	}
	setDisplayColor(R, G, B, A){
		if(PointShader.isBound() == false) PointShader.Bind();
		this.DisplayColor[0] = R; this.DisplayColor[1] = G; this.DisplayColor[2] = B; this.DisplayColor[3] = A;
		gl.uniform4f(PointShader.ULColor, R, G, B, A);
	}
	setDisplaySize(Size){
		if(PointShader.isBound() == false) PointShader.Bind();
		this.DisplaySize = Size;
		gl.uniform1f(PointShader.ULPointSize, Size);
	}
	setPosition(x,y,z){
		if(PointShader.isBound() == false) PointShader.Bind();
		this.Position[0] = x; this.Position[1] = y; this.Position[2] = z;
		gl.uniform3f(PointShader.ULPosition, x, y, z);
		this.bNeedsToUpdateUniformBlock = true;
	}
	setIntensity(i){ this.Intensity = i; this.bNeedsToUpdateUniformBlock = true; }
	setColor(R,G,B,A){ this.Color[0] = R; this.Color[1] = G; this.Color[2] = B; this.Color[3] = A; this.bNeedsToUpdateUniformBlock = true; }
	
	setLightType(lightType){
		this.flags = (this.flags & ~CLight.bitmask_LightType) | (lightType << CLight.bitnumb_LightType);  this.bNeedsToUpdateUniformBlock = true;
	}
	/*
	static getUniformLocationsFromShader(shader, baseName){
		
		var ULPosition = shader.getUniformLocation(baseName + ".position");
		var ULIntensity = shader.getUniformLocation(baseName + ".intensity");
		var ULColor = shader.getUniformLocation(baseName + ".color");
		var ULFlags = shader.getUniformLocation(baseName + ".flags");
		
		var output = {"ULPosition" : ULPosition,
					  "ULIntensity" : ULIntensity,
					  "ULColor" : ULColor,
					  "ULFlags" : ULFlags};
		
		return output;
	}
	
	UploadToShader(shader, uniformLocations){

		if(shader.isBound() == false) shader.Bind();
		gl.uniform4f(uniformLocations.ULPosition, this.Position[0], this.Position[1], this.Position[2], 0.0f);
		gl.uniform1f(uniformLocations.ULIntensity, this.Intensity);
		gl.uniform4f(uniformLocations.ULColor, this.Color[0], this.Color[1], this.Color[2], 1.0f);
		gl.uniform1i(uniformLocations.ULFlags, this.flags);
	}
	*/
	
	AttachUniformBlockTo(shader){
		if(this.SlotID >= MAX_LIGHTS){
			alert("CLight.SlotID >= MAX_LIGHTS"); return;
		}
		
		var strUBName = "ubLight["+this.SlotID+"]";
		// shader.UBLights[i] = gl.getUniformBlockIndex(shader.program, "Lights[" + i + "]");
		// var bindingPoint = shader.getUniformBlockBindingPoint(strUBName);
		shader.addUniformBlock(strUBName, this.UniformBlock); 
	}
	
	RenderPosition(){
		if(PointShader.isBound() == false) PointShader.Bind();
			
			CFramebuffer.ActivateDrawBuffers(PointShader);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.vertexAttribPointer(PointShader.ALVertexPosition, this.glVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(PointShader.ALVertexPosition);
			
			gl.uniform4f(PointShader.ULColor, this.Color[0], this.Color[1], this.Color[2], 1.0);
			gl.uniform1i(PointShader.ULFlags, this.flags);
			
			gl.drawArrays(gl.POINTS, 0, 1);
	}
}

CLight.bitmask_LightType = 0xe0000000; //binary: 1110 0000  0000 0000  0000 0000  0000 0000
CLight.bitnumb_LightType = 29; //startni bit

CLight.ELightType = [];
CLight.ELightType.Point = 1;
CLight.ELightType.Directional = 2;
CLight.ELightType.Spot = 3;


var globalLightList = null;

export class CLightList
{
	constructor(){
		this.lights = [];
	}
	
	/* static CreateShader(vertexFile, fragmentFile){
		var SlotID = CLightList.singleton().lights.length;
		var light = new CShader(SlotID);
		light.CompileFromFile(vertexFile,fragmentFile);
		CLightList.singleton().lights[SlotID] = light;
		return light;
	} */
	
	static addLight(light){
		light.SlotID = CLightList.singleton().lights.length;
		CLightList.singleton().lights[CLightList.singleton().lights.length] = light;
	}
	
	static Init(){
		if(globalLightList == null)
			globalLightList = new CLightList();
	}
	
	static get(SlotID){
		if(SlotID < CLightList.singleton().lights.length){
			return CLightList.singleton().lights[SlotID];
		}
		return null;
	}
	
	static count(){
		return CLightList.singleton().lights.length;
	}
	
	static singleton(){
		CLightList.Init();
		return globalLightList;
	}
	
	static Update(){
		var list = CLightList.singleton();
		for(var i = 0; i < list.lights.length; ++i){
			list.lights[i].Update();
		}
	}
}
