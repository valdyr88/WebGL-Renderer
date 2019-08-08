import { gl, glPrintError } from "./../../GLExt/glContext.js";
import * as vMath from "./../../glMatrix/gl-matrix.js";
import { CShader, CUniformBlockBuffer, CUniformBlockBinding } from "./../../GLExt/glShader.js";
import * as command from "./command.js"

export class CBrush extends command.ICommandExecute{
	
	constructor(){
		super();
		this.setType("CBrush");
		this.position = [0,0];
		this.rotation = [0,0];
		this.scale = [1,1];
		this.color = [1,1,1,1];
		this.offset = [0,0];
		this.dt = 0.0;
		this.time = 0.0;
		this.random = 0.0;
		this.intensity = 1.0;
		this.flags = 0;
		this.UniformBlock = null;
		this.CreateUniformBlock();
		this.shader = null;
		this.shaderName = "";
		this.bNeedsToUpdateUniformBlock = true;
		this.bPressed = false; //is applied to document
	}
	
	setPressed(bPressed){
		this.flags = (this.flags & ~CBrush.bitmask_bPressed) | (bPressed << CBrush.bitnumb_bPressed);
	}
	setStrokeStart(bStart){
		if(bStart == undefined) bStart = true;
		this.flags = (this.flags & ~CBrush.bitmask_isStrokeStart) | (bStart << CBrush.bitnumb_isStrokeStart);
	}
	setStrokeEnd(bEnd){
		if(bEnd == undefined) bEnd = true;
		this.flags = (this.flags & ~CBrush.bitmask_isStrokeEnd) | (bEnd << CBrush.bitnumb_isStrokeEnd);
	}
	
	setPosition(pos){ this.position[0] = pos[0]; this.position[1] = 1.0 - pos[1]; this.bNeedsToUpdateUniformBlock = true; }
	setRotation(rot){ this.rotation[0] = rot[0]; this.rotation[1] = rot[1]; this.bNeedsToUpdateUniformBlock = true; }
	setOffset(offs){ this.offset[0] = offs[0]; this.offset[1] = offs[1]; this.bNeedsToUpdateUniformBlock = true; }
	setColor(R,G,B,A){ this.color[0] = R; this.color[1] = G; this.color[2] = B; this.color[3] = A; this.bNeedsToUpdateUniformBlock = true; }
	setDeltaTime(deltaT){ this.dt = deltaT; this.bNeedsToUpdateUniformBlock = true; }
	setTime(T){ this.time = T; this.bNeedsToUpdateUniformBlock = true; }
	setRandom(r){ this.random = r; this.bNeedsToUpdateUniformBlock = true; }
	
	SerializeToUniformBlock(){
		var FloatUint8 = CUniformBlockBuffer.ConvertTypedArray( 
							new Float32Array([this.position[0], this.position[1], this.rotation[0], this.rotation[1],
											  this.color[0], this.color[1], this.color[2], this.color[3],
											  this.offset[0], this.offset[1], this.dt, this.random,
											  this.scale[0], this.scale[1], this.intensity]),
							new Uint32Array( [this.flags] ),
											Uint8Array);
		/* var i = 0;
		for(var b = 0; b < FloatUint8.length; ++b){
			this.UniformBlock.data[i] = FloatUint8[b]; ++i; } */
		this.UniformBlock.setData(FloatUint8);
	}
	
	CreateUniformBlock(){
		if(this.UniformBlock != null) return;
		
		this.UniformBlock = new CUniformBlockBuffer();
		this.UniformBlock.Create(4);
	}
	
	UpdateUniformBlock(){
		if(this.bNeedsToUpdateUniformBlock == false) return;
		this.SerializeToUniformBlock();
		this.UniformBlock.Update();
		this.bNeedsToUpdateUniformBlock = false;
	}
	
	Update(){
		this.UpdateUniformBlock();
	}
	
	AttachUniformBlockTo(shdr){
		var strUBName = "ubBrush";
		// shdr.UBLights[i] = gl.getUniformBlockIndex(shdr.program, "Lights[" + i + "]");
		// var bindingPoint = shdr.getUniformBlockBindingPoint(strUBName);
		shdr.addUniformBlock(strUBName, this.UniformBlock); 
	}
	
	CreateBrushShader(str_brush_shader){
		this.shader = new CShader(-1);
		if(this.shader.CompileFromFile("simpleVS", str_brush_shader) == false) alert("nije kompajliran brush shader: " + str_brush_shader);
		this.shader.InitDefaultUniformLocations();
		this.shader.InitDefaultAttribLocations();
		this.AttachUniformBlockTo(this.shader);
		this.shader.ULBrushPoints = this.shader.getUniformLocation("BrushPoints");
		this.shader.ULBrushPointCount = this.shader.getUniformLocation("BrushPointCount");
		this.shaderName = str_brush_shader;
	}
	
	ReCreateBrushShader(str_brush_shader){
		if(this.shader == null)
			return this.CreateBrushShader(str_brush_shader);
		if(this.shaderName != str_brush_shader)
			return this.CreateBrushShader(str_brush_shader);
		return;
	}
	
	setUniformUpdateFunction(func){
		this.shader.UpdateUniforms = func;
	}
	setUniformBindFunction(func){
		this.shader.BindUniforms = func;
	}
	
	//------------------------------------------------------------------------
	
	SaveAsCommand(){
		var cmd = new command.CCommand();
		cmd.set(this.objectId, this.type, "store",
				this.position, this.rotation, this.color, this.offset,
				this.dt, this.time, this.random, this.shaderName, this.bNeedsToUpdateUniformBlock,
				this.shader.UpdateUniforms, this.shader.BindUniforms );
		return cmd;
	}
	LoadFromCommand(cmd){
		if(this.type != cmd.getObjectType()) return false;
		if(cmd.getCommandType() != "store") return false;
		
		this.position = [...cmd.getCommandParams()[0].value];
		this.rotation = [...cmd.getCommandParams()[1].value];
		this.color = [...cmd.getCommandParams()[2].value];
		this.offset = [...cmd.getCommandParams()[3].value];
		this.dt = cmd.getCommandParams()[4].value;
		this.time = cmd.getCommandParams()[5].value;
		this.random = cmd.getCommandParams()[6].value;
		let lShaderName = cmd.getCommandParams()[7].value;
		this.bNeedsToUpdateUniformBlock = cmd.getCommandParams()[8].value;
		
		this.ReCreateBrushShader(lShaderName);
		this.setUniformUpdateFunction(cmd.getCommandParams()[9].value);
		this.setUniformBindFunction(cmd.getCommandParams()[10].value);
		
		return true;
	}
	//------------------------------------------------------------------------
	
	UploadPointListToShader(points){
		if(this.shader.ULBrushPoints == -1) return false;
		if(points.length > CBrush.ubBrushPoints_MAX_BRUSH_POINTS) return false;
		
		let combinedArray = new Float32Array(points.length*2);
		for(let i = 0; i < points.length; ++i){ combinedArray.set(points[i], i*2); }
		
		let rtn = this.shader.setFloat2UniformArray(this.shader.ULBrushPoints, combinedArray);
		return rtn && this.shader.setIntUniform(this.shader.ULBrushPointCount, points.length);
	}
}

CBrush.Type_Airbrush_Gauss = 1;
CBrush.Type_Airbrush_OneOverLength = 2;
CBrush.Type_Pencil_Aliased = 3;
CBrush.Type_Pencil_AntiAliased = 4;

CBrush.ubBrushPoints_MAX_BRUSH_POINTS = 256; //match this with constant in ubBrushPoints.glsl

CBrush.bitnumb_bPressed = 31;
CBrush.bitmask_bPressed = (1 << CBrush.bitnumb_bPressed);//0x7fffffff
CBrush.bitnumb_isStrokeStart = 0;
CBrush.bitmask_isStrokeStart = (1 << CBrush.bitnumb_isStrokeStart);
CBrush.bitnumb_isStrokeEnd = 1;
CBrush.bitmask_isStrokeEnd = (1 << CBrush.bitnumb_isStrokeEnd);

//ToDo: continue this class
export class CPencil extends CBrush{
	
	constructor(){
		super();
		this.setType("CPencil");
	}
	
}