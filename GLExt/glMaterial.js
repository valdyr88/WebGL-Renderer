import { gl, glPrintError, CGLExtObject } from "./glContext.js";
// import * as global from "./globalStorage.js"
import * as sys from "./../System/sys.js"
import { CModel } from "./glModel.js";
import { CShader, CShaderList } from "./glShader.js";
import { CTexture, CTextureList } from "./glTexture.js";
import { CBlendMode } from "./glBlendMode.js"
import * as vMath from "../glMatrix/gl-matrix.js";

export class CMaterialParam
{
	constructor(name){
		this.name = name;
		this.bindpoint = "";
		this.value = [];
		this.type = "";
		this.uniformLocation = -1;
	}
	
	CopyFrom(param){
		this.name = param.name;
		this.bindpoint = param.bindpoint;
		this.value = param.value;
		this.type = param.type;
		this.uniformLocation = param.uniformLocation;
	}
	
	setUniformToShader(shader){
		if(shader == null) return;
		
		switch(this.type){
			case "float": shader.setFloatUniform(this.uniformLocation, this.value); break;
			case "vec2": shader.setFloat2Uniform(this.uniformLocation, this.value); break;
			case "vec3": shader.setFloat3Uniform(this.uniformLocation, this.value); break;
			case "vec4": shader.setFloat4Uniform(this.uniformLocation, this.value); break;
			
			case "int": shader.setIntUniform(this.uniformLocation, this.value); break;
			case "ivec2": shader.setInt2Uniform(this.uniformLocation, this.value); break;
			case "ivec3": shader.setInt3Uniform(this.uniformLocation, this.value); break;
			case "ivec4": shader.setInt4Uniform(this.uniformLocation, this.value); break;
			
			case "bool": break;
			case "bvec2": break;
			case "bvec3": break;
			case "bvec4": break;
		}

	}
	
	static LoadParamsFromXMLDOM(dom){
		var params = [];
		dom.getElementsByTagNameImmediate = sys.utils.getElementsByTagNameImmediate;
		
		let domParams = dom.getElementsByTagNameImmediate("param");
		for(let p = 0; p < domParams.length; ++p){
			let domparam = domParams[p];
			
			let bindpoint = domparam.attributes.bindpoint.value;
			let value = domparam.attributes.value.value;
			let type = domparam.attributes.type.value;
			
			var param = new CMaterialParam(bindpoint);
			param.bindpoint = bindpoint;
			param.type = type;
			
			let values = [];
			
			switch(type){
				case "float":
					param.value = parseFloat(value); break;
				case "vec2":
					values = value.split(",");
					param.value = [parseFloat(values[0]), parseFloat(values[1])]; break;
				case "vec3":
					values = value.split(",");
					param.value = [parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2])]; break;
				case "vec4":
					values = value.split(",");
					param.value = [parseFloat(values[0]), parseFloat(values[1]), parseFloat(values[2]), parseFloat(values[3])]; break;
				
				case "int":
					param.value = parseInt(value); break;
				case "ivec2":
					values = value.split(",");
					param.value = [parseInt(values[0]), parseInt(values[1])]; break;
				case "ivec3":
					values = value.split(",");
					param.value = [parseInt(values[0]), parseInt(values[1]), parseInt(values[2])]; break;
				case "ivec4":
					values = value.split(",");
					param.value = [parseInt(values[0]), parseInt(values[1]), parseInt(values[2]), parseInt(values[3])]; break;
				
				case "bool":
					param.value = (value == "true"); break;
				case "bvec2":
					values = value.split(",");
					param.value = [(values[0] == "true"), (values[1] == "true")]; break;
				case "bvec3":
					values = value.split(",");
					param.value = [(values[0] == "true"), (values[1] == "true"), (values[2] == "true")]; break;
				case "bvec4":
					values = value.split(",");
					param.value = [(values[0] == "true"), (values[1] == "true"), (values[2] == "true"), (values[3] == "true")]; break;
			}
			
			params[params.length] = param;
		}
		
		return params;
	}
}

export class CTextureShaderLink
{
	constructor(textureSlotID, strUniformLocation){
		this.TextureSlotID = textureSlotID;
		this.UniformLocationStr = strUniformLocation;
		this.TextureName = "";
	}
}

export class CMaterial extends CGLExtObject
{
	constructor(slotID)
	{
		super();
		this.id = "";
		this.shaderName = "";
		this.shaderID = -1;
		this.params = [];
		this.textureLinks = [];
		this.renderpass = "-";
		this.bIsMaterialLink = false;
	}
	
	isMaterialLink(){ return this.bIsMaterialLink; }
	
	LoadFromXMLDOM(material){
		material.getElementsByTagNameImmediate = sys.utils.getElementsByTagNameImmediate;
		
		if(material.attributes.shader !== undefined)
			this.shaderName = material.attributes.shader.value;
		if(material.attributes.renderpass !== undefined)
			this.renderpass = material.attributes.renderpass.value;
		if(material.attributes.id !== undefined)
			this.id = material.attributes.id.value;
		
		this.params = CMaterialParam.LoadParamsFromXMLDOM(material);
		
		let txs = material.getElementsByTagNameImmediate("texture");
		for(let j = 0; j < txs.length; ++j){
			let t = txs[j];
			
			let tx = CTextureList.getByName(t.attributes.txid.value);
			var texlink = new CTextureShaderLink(tx.SlotID, t.attributes.bindpoint.value);
			texlink.TextureName = t.attributes.txid.value;
			
			this.textureLinks[this.textureLinks.length] = texlink;
		}
		
		if(material.attributes.shader === undefined){
			this.bIsMaterialLink = true;
			return false; //material link, needs to get params from other material
		}
		
		let shader = CShaderList.getByName(this.shaderName);
		if(shader != null){
			this.shaderID = shader.SlotID;
			for(let i = 0; i < this.params.length; ++i){
				let p = this.params[i];
				
				p.uniformLocation = shader.getUniformLocation(p.bindpoint);
			}
		}
		
		return true;
	}
	
	LinkFromMaterial(material){
		
		let paramNo = this.params.length;
		for(let p = 0; p < material.params.length; ++p){
			let param = material.params[p];
			let bHasParam = false;
			for(let h = 0; h < paramNo; ++h){ 
				if(this.params[h].name == param.name){
					bHasParam = true; break; }
			}
			if(bHasParam == true) continue;
			
			this.params[this.params.length] = param;
		}
		
		let texNo = this.textureLinks.length;
		for(let t = 0; t < material.textureLinks.length; ++t){
			let texlink = material.textureLinks[t];
			let bHasTexLink = false;
			for(let h = 0; h < texNo; ++h){
				if(this.textureLinks[h].UniformLocationStr == texlink.UniformLocationStr){
					bHasTexLink = true; break;
				}
			}
			if(bHasTexLink == true) continue;
			
			this.textureLinks[this.textureLinks.length] = texlink;
		}
		
		this.shaderName = material.shaderName;
		
		let shader = CShaderList.getByName(this.shaderName);
		if(shader != null){
			this.shaderID = shader.SlotID;
			for(let i = 0; i < this.params.length; ++i){
				let p = this.params[i];
				
				p.uniformLocation = shader.getUniformLocation(p.bindpoint);
			}
		}
		
		return true;
	}
}