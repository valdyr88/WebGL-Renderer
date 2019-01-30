import { gl, glPrintError } from "./../../GLExt/glContext.js";
import * as vMath from "./../../glMatrix/gl-matrix.js";
import { CShader, CUniformBlockBuffer, CUniformBlockBinding } from "./../../GLExt/glShader.js";

export class CBrush{
	
	constructor(){
		this.position = [0,0];
		this.rotation = [0,0];
		this.color = [1,1,1,1];
		this.offset = [0,0];
		this.UniformBlock = null;
		this.CreateUniformBlock();
		
		this.bNeedsToUpdateUniformBlock = true;
	}
	
	setPosition(pos){ this.position[0] = pos[0]; this.position[1] = pos[1]; this.bNeedsToUpdateUniformBlock = true; }
	setRotation(rot){ this.rotation[0] = rot[0]; this.rotation[1] = rot[1]; this.bNeedsToUpdateUniformBlock = true; }
	setOffset(offs){ this.offset[0] = offs[0]; this.offset[1] = offs[1]; this.bNeedsToUpdateUniformBlock = true; }
	setColor(R,G,B,A){ this.color[0] = R; this.color[1] = G; this.color[2] = B; this.color[3] = A; this.bNeedsToUpdateUniformBlock = true; }
	
	SerializeToUniformBlock(){
		var FloatUint8 = CUniformBlockBuffer.ConvertTypedArray( new Float32Array([this.position[0], this.position[1], this.rotation[0], this.rotation[1],
																this.color[0], this.color[1], this.color[2], this.color[3]], this.offset[0], this.offset[1], 0.0, 0.0),
																Uint8Array);
		var i = 0;
		for(var b = 0; b < FloatUint8.length; ++b){
			this.UniformBlock.data[i] = FloatUint8[b]; ++i; }
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
	
	Update(){
		this.UpdateUniformBlock();
	}
	
	AttachUniformBlockTo(shader){
		
		var strUBName = "ubBrush";
		// shader.UBLights[i] = gl.getUniformBlockIndex(shader.program, "Lights[" + i + "]");
		// var bindingPoint = shader.getUniformBlockBindingPoint(strUBName);
		shader.addUniformBlock(strUBName, this.UniformBlock); 
	}
}