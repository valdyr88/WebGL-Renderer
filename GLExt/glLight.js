import { gl, glPrintError } from "./glContext.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { Shader, UniformBlockBuffer, UniformBlockBinding } from "./glShader.js";

var PointShader = -1;

function InitPointShader(){
	if(PointShader != -1) return true;
	
	PointShader = new Shader(-1);
	
	var vsCode = 
	"\
	attribute vec4 aVertexPosition;\
	uniform mat4 ViewMatrix;\
	uniform mat4 ProjectionMatrix;\
	uniform float PointSize;\
	uniform vec3 VertexPosition;\
	varying vec3 oaVertexPosition;\
	\
	void main(void){ \
		gl_Position = (ProjectionMatrix * (ViewMatrix * vec4(VertexPosition,1.0)));\
		gl_PointSize = PointSize;\
		oaVertexPosition = aVertexPosition.xyz;\
	}\
	";
	
	var fsCode =
	"precision mediump float;\
	uniform vec4 Color;\
	\
	void main(void){ \
		gl_FragColor = Color;\
	}\
	";
	if(PointShader.Compile(vsCode, fsCode) == false) return false;
	PointShader.setVertexAttribLocations("aVertexPosition");
	PointShader.ULPointSize = PointShader.getUniformLocation("PointSize");
	PointShader.setTransformMatricesUniformLocation(null,"ViewMatrix","ProjectionMatrix");
	PointShader.ULColor = PointShader.getUniformLocation("Color");
	PointShader.ULPosition = PointShader.getUniformLocation("VertexPosition");
	
	return true;
}

export var MAX_LIGHTS = 1;

export class Light{
	
	constructor(slotID){
		
		this.SlotID = slotID;
		this.Position = vMath.vec3.create();
		this.Intensity = 1.0;
		this.Color = vMath.vec4.create();
		this.DisplaySize = 10.0;
		this.DisplayColor = vMath.vec4.create();
		this.Flags = 0;
		this.glVertexBuffer = -1;
		this.UniformBlock = null;
		
		InitPointShader();
		this.CreatePointBuffer();
		this.CreateUniformBlock();
		
		this.bNeedsToUpdateUniformBlock = true;
	}
	
	/*
		struct Light{
			vec4 position;			//1
			vec4 color;				//2
			float intensity;		//3
			int flags;
		};
	*/
	
	SerializeToUniformBlock(){
		var FloatUint8 = UniformBlockBuffer.ConvertTypedArray( new Float32Array([this.Position[0],this.Position[1],this.Position[2],0.0,this.Color[0],this.Color[1],this.Color[2],this.Color[3],this.Intensity]), Uint8Array );
		var IntUint8 =   UniformBlockBuffer.ConvertTypedArray( new Uint32Array([this.Flags, 0, 0]), Uint8Array );
		
		var i = 0;
		for(var b = 0; b < FloatUint8.length; ++b){
			this.UniformBlock.data[i] = FloatUint8[b]; ++i; }
		for(var b = 0; b < IntUint8.length; ++b){
			this.UniformBlock.data[i] = IntUint8[b]; ++i; }
	}
	
	CreateUniformBlock(){		
		if(this.UniformBlock != null) return;
		
		this.UniformBlock = new UniformBlockBuffer();
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
		if(PointShader.isBinded() == false) PointShader.Bind();
		this.DisplayColor[0] = R; this.DisplayColor[1] = G; this.DisplayColor[2] = B; this.DisplayColor[3] = A;
		gl.uniform4f(PointShader.ULColor, R, G, B, A);
	}
	setDisplaySize(Size){
		if(PointShader.isBinded() == false) PointShader.Bind();
		this.DisplaySize = Size;
		gl.uniform1f(PointShader.ULPointSize, Size);
	}
	setPosition(x,y,z){
		if(PointShader.isBinded() == false) PointShader.Bind();
		this.Position[0] = x; this.Position[1] = y; this.Position[2] = z;
		gl.uniform3f(PointShader.ULPosition, x, y, z);
		this.bNeedsToUpdateUniformBlock = true;
	}
	setIntensity(i){ this.Intensity = i; this.bNeedsToUpdateUniformBlock = true; }
	setColor(R,G,B,A){ this.Color[0] = R; this.Color[1] = G; this.Color[2] = B; this.Color[3] = A; this.bNeedsToUpdateUniformBlock = true; }
		
	/*
	static getUniformLocationsFromShader(light, baseName){
		
		var ULPosition = light.getUniformLocation(baseName + ".position");
		var ULIntensity = light.getUniformLocation(baseName + ".intensity");
		var ULColor = light.getUniformLocation(baseName + ".color");
		var ULFlags = light.getUniformLocation(baseName + ".flags");
		
		var output = {"ULPosition" : ULPosition,
					  "ULIntensity" : ULIntensity,
					  "ULColor" : ULColor,
					  "ULFlags" : ULFlags};
		
		return output;
	}
	
	UploadToShader(light, uniformLocations){

		if(light.isBinded() == false) light.Bind();
		gl.uniform4f(uniformLocations.ULPosition, this.Position[0], this.Position[1], this.Position[2], 0.0f);
		gl.uniform1f(uniformLocations.ULIntensity, this.Intensity);
		gl.uniform4f(uniformLocations.ULColor, this.Color[0], this.Color[1], this.Color[2], 1.0f);
		gl.uniform1i(uniformLocations.ULFlags, this.Flags);
	}
	*/
	
	AttachUniformBlockTo(light){
		if(this.SlotID >= MAX_LIGHTS){
			alert("Light.SlotID >= MAX_LIGHTS"); return;
		}
		
		var strUBName = "ubLight["+this.SlotID+"]";
		// light.UBLights[i] = gl.getUniformBlockIndex(light.program, "Lights[" + i + "]");
		// var bindingPoint = light.getUniformBlockBindingPoint(strUBName);
		light.addUniformBlock(strUBName, this.UniformBlock); 
	}
	
	RenderPosition(){
		if(PointShader.isBinded() == false) PointShader.Bind();
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.vertexAttribPointer(PointShader.ALVertexPosition, this.glVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(PointShader.ALVertexPosition);
			
			gl.drawArrays(gl.POINTS, 0, 1);
	}
}


var globalLightList = null;

export class LightList
{
	constructor(){
		this.lights = [];
	}
	
	/* static CreateShader(vertexFile, fragmentFile){
		var SlotID = LightList.singleton().lights.length;
		var light = new Shader(SlotID);
		light.CompileFromFile(vertexFile,fragmentFile);
		LightList.singleton().lights[SlotID] = light;
		return light;
	} */
	
	static addLight(light){
		light.SlotID = LightList.singleton().lights.length;
		LightList.singleton().lights[LightList.singleton().lights.length] = light;
	}
	
	static Init(){
		if(globalLightList == null)
			globalLightList = new LightList();
	}
	
	static get(SlotID){
		if(SlotID < LightList.singleton().lights.length){
			return LightList.singleton().lights[SlotID];
		}
		return null;
	}
	
	static count(){
		return LightList.singleton().lights.length;
	}
	
	static singleton(){
		LightList.Init();
		return globalLightList;
	}
	
	static Update(){
		var list = LightList.singleton();
		for(var i = 0; i < list.lights.length; ++i){
			list.lights[i].Update();
		}
	}
}
