import { gl, getContentsFromFile, glPrintError, CGLExtObject } from "./glContext.js";
import { CShader, CShaderList } from "./glShader.js";
import { CTexture, CTextureList } from "./glTexture.js";
import { CBlendMode } from "./glBlendMode.js"
import { CMaterialParam, CMaterial, CTextureShaderLink } from "./glMaterial.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import * as sys from "./../System/sys.js"

/*
var RenderPrimitiveType = Object.freeze( {"POINTS":1,"LINES":2,"TRIANGLES":3,
										  "LINE_STRIP":4, "LINE_LOOP":5, "LINE_STRIP_ADJACENCY":6, "LINES_ADJACENCY":7,
										  "TRIANGLE_STRIP":8, "TRIANGLE_FAN":9, "TRIANGLE_STRIP_ADJACENCY":10, "TRIANGLES_ADJACENCY"11, "PATCHES":12});
*/

function getAsVector(vecNumComponents, Buffer, id){
	switch(vecNumComponents){
		case 1: return Buffer[id]; break;
		case 2: return vMath.vec2.fromValues( Buffer[id*2], Buffer[id*2+1]); break;
		case 3: return vMath.vec3.fromValues( Buffer[id*3], Buffer[id*3+1], Buffer[id*3+2]); break;
		case 4: return vMath.vec4.fromValues( Buffer[id*4], Buffer[id*4+1], Buffer[id*4+2], Buffer[id*4+3]); break;
	}
	return null;		
}
function Float32ArrayFromBuffer(itemSize, Buffer){
	var len = Buffer.length * itemSize;
	var floatArray = new Float32Array(len);
	
	for(var i = 0; i < Buffer.length; ++i){
		var vec = Buffer[i];
		for(var j = 0; j < itemSize; ++j){
			floatArray[i*itemSize+j] = vec[j];
		}
	}
	return floatArray;
}

 /*
 GL_ZERO, GL_ONE, GL_SRC_COLOR, GL_ONE_MINUS_SRC_COLOR, GL_DST_COLOR, GL_ONE_MINUS_DST_COLOR,
 GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA, GL_DST_ALPHA, GL_ONE_MINUS_DST_ALPHA. GL_CONSTANT_COLOR,
 GL_ONE_MINUS_CONSTANT_COLOR, GL_CONSTANT_ALPHA, and GL_ONE_MINUS_CONSTANT_ALPHA.
 
 GL_FUNC_ADD, GL_FUNC_SUBTRACT, GL_FUNC_REVERSE_SUBTRACT, GL_MIN, GL_MAX.
 */

 /*
 gl.ZERO, gl.ONE, gl.SRC_COLOR, gl.ONE_MINUS_SRC_COLOR, gl.DST_COLOR, gl.ONE_MINUS_DST_COLOR,
 gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.DST_ALPHA, gl.ONE_MINUS_DST_ALPHA. gl.CONSTANT_COLOR,
 gl.ONE_MINUS_CONSTANT_COLOR, gl.CONSTANT_ALPHA, and gl.ONE_MINUS_CONSTANT_ALPHA.
 
 gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.MIN, gl.MAX.
 */


export class CModel extends CGLExtObject
{
	constructor(slotID)
	{
		super();
		this.SlotID = slotID;
		
		this.VertexBuffer = [];
		this.BinormalBuffer = [];
		this.TangentBuffer = [];
		this.NormalBuffer = [];
		this.TexCoordBuffer = [];
		this.IndexBuffer = [];
		
		this.glVertexBuffer = -1;
		this.glIndexBuffer = -1;
		this.glNormalBuffer = -1;
		this.glBinormalBuffer = -1;
		this.glTangentBuffer = -1;
		this.glTexCoordBuffer = -1;
			
		this.shaderID = -1;
		this.textures = [];
		
		this.blendMode = null;
		
		this.VertexType = "";
		
		this.Position = vMath.vec3.create();
		this.Transform = vMath.mat4.create();
		this.LocalTransform = vMath.mat4.create();
		vMath.mat4.identity(this.Transform);
		vMath.mat4.identity(this.LocalTransform);
		
		this.name = "";
		
		this.bIsLoaded = false;
		
		this.material = null;
		
		this.params = [];		
	}
	
	isLoaded(){ return this.bIsLoaded; }
	
	setMaterial(m){ 
		this.material = m;
		this.shaderID = this.material.shaderID;
		this.textures = this.material.textureLinks;
	}
	
	getRenderpass(){
		if(this.material == null) return "-";
		return this.material.renderpass;
	}
	
	setParams(prms){
		this.params = prms;
		
		let forward = null; let right = null; let up = null; let scale = null;
		
		for(let p = 0; p < this.params.length; ++p){
			let param = this.params[p];
			
			switch(param.bindpoint){
				case "forward": forward = vMath.vec3.clone(param.value); break;
				case "right": right = vMath.vec3.clone(param.value); break;
				case "up": up = vMath.vec3.clone(param.value); break;
				case "scale": scale = (param.type == "float")? [param.value,param.value,param.value] : vMath.vec3.clone(param.value); break;
			}
		}
		
		if(forward != null && right != null && up != null){
			vMath.vec3.normalize(forward, forward);
			vMath.vec3.normalize(right, right);
			vMath.vec3.normalize(up, up);
			
			vMath.mat4.setForwardRightUp(this.LocalTransform, this.LocalTransform, forward, right, up);
		}
		if(scale != null){
			vMath.mat4.scale(this.LocalTransform, this.LocalTransform, scale);
		}
	}
	
	setBlendMode(b){
		if(this.blendMode == null) this.blendMode = new CBlendMode();
		this.blendMode.setBlendMode(b);
	}
	
	setTexture(texture, uniformLocationStr){
		this.textures[this.textures.length] = new CTextureShaderLink(texture.SlotID, uniformLocationStr);
	}
	setShader(shader){
		this.shaderID = shader.SlotID;
	}
	
	BindTextureToShader(slot, textureLink, shader){
		var ULocation = shader.getPrefetchedUniformLocation(textureLink.UniformLocationStr);
		var texture = CTextureList.get(textureLink.TextureSlotID);
		texture.Bind(slot, ULocation);
	}
	BindTexturesToShader(shader){
		for(var i = 0; i < this.textures.length; ++i){
			this.BindTextureToShader(i, this.textures[i], shader);
		}
	}
	
	isTypeOf(string){ return this.VertexType == string; }
	
	setPosition(pos){
		this.Position = pos;
		vMath.mat4.setTranslation(this.Transform,this.Transform,pos);
		vMath.mat4.multiply(this.Transform, this.Transform, this.LocalTransform);
	}
	
	CreateBuffers(){
		switch(this.VertexType){
			case "v":
				this.glVertexBuffer = gl.createBuffer();
				break;
			case "vn":
				this.glVertexBuffer = gl.createBuffer();
				this.glNormalBuffer = gl.createBuffer();
				break;
			case "vt":
				this.glVertexBuffer = gl.createBuffer();
				this.glTexCoordBuffer = gl.createBuffer();
				break;
			case "vtn":
				this.glVertexBuffer = gl.createBuffer();
				this.glNormalBuffer = gl.createBuffer();
				this.glTexCoordBuffer = gl.createBuffer();
				this.glTangentBuffer = gl.createBuffer();
				break;
		}
		this.glIndexBuffer = gl.createBuffer();
		
		if(this.glVertexBuffer != -1){
			let f32array = Float32ArrayFromBuffer(this.VertexBuffer.itemSize, this.VertexBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, f32array, gl.STATIC_DRAW);
			this.glVertexBuffer.itemSize = this.VertexBuffer.itemSize;
			this.glVertexBuffer.numItems = this.VertexBuffer.length;
		}
		
		if(this.glNormalBuffer != -1){
			let f32array = Float32ArrayFromBuffer(this.NormalBuffer.itemSize, this.NormalBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glNormalBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, f32array, gl.STATIC_DRAW);
			this.glNormalBuffer.itemSize = this.NormalBuffer.itemSize;
			this.glNormalBuffer.numItems = this.NormalBuffer.length;
		}
		
		if(this.glTexCoordBuffer != -1){
			let f32array = Float32ArrayFromBuffer(this.TexCoordBuffer.itemSize, this.TexCoordBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, f32array, gl.STATIC_DRAW);
			this.glTexCoordBuffer.itemSize = this.TexCoordBuffer.itemSize;
			this.glTexCoordBuffer.numItems = this.TexCoordBuffer.length;
		}
		
		if(this.glTangentBuffer != -1){
			let f32array = Float32ArrayFromBuffer(this.TangentBuffer.itemSize, this.TangentBuffer);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTangentBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, f32array, gl.STATIC_DRAW);
			this.glTangentBuffer.itemSize = this.TangentBuffer.itemSize;
			this.glTangentBuffer.numItems = this.TangentBuffer.length;
		}
		
		if(this.glIndexBuffer != -1){
			let ui32array = new Uint32Array(this.IndexBuffer);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ui32array, gl.STATIC_DRAW);
			this.glIndexBuffer.numItems = this.IndexBuffer.length;
		}
		
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	}
	
	DeleteBuffers(){
		if(this.glVertexBuffer != -1) gl.deleteBuffer(this.glVertexBuffer); this.glVertexBuffer = -1;
		if(this.glNormalBuffer != -1) gl.deleteBuffer(this.glNormalBuffer); this.glNormalBuffer = -1;
		if(this.glTexCoordBuffer != -1) gl.deleteBuffer(this.glTexCoordBuffer); this.glTexCoordBuffer = -1;
		if(this.glIndexBuffer != -1) gl.deleteBuffer(this.glIndexBuffer); this.glIndexBuffer = -1;
	}
	
	ImportFromObj(string){
		
		var ObjModelImport = new CModelImport();
		ObjModelImport.ImportOBJ(this, string);
		ObjModelImport.CalcTangents(this);
		
		this.CreateBuffers();
		// delete ObjModelImport;
		this.bIsLoaded = true;
	}
	
	ImportFrom(id){
		var str = getContentsFromFile(id);
		if(str == null) return false;
		this.name = id;
		
		this.ImportFromObj(str);
		return true;
	}
	
	DelayedImportFromPath(src){
		
		let thisMdl = this;
		
		sys.fetch.fetchTextFileSrc(src, function(tekst){
			thisMdl.ImportFromObj(tekst);
			thisMdl.name = src;
		});		
	}
	
	RenderIndexed(shader, mode){
		if(this.isLoaded() == false) return;
		/*
		shader.ALVertexPosition;
		shader.ALVertexNormal;
		shader.ALVertexTangent;
		shader.ALVertexBinormal;
		shader.ALVertexTexCoord;
		*/
		
		if(shader.isBound() == false){ shader.Bind(); }
        // gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
        if(shader.ULMatrixModel != -1 && shader.ULMatrixModel != null) gl.uniformMatrix4fv(shader.ULMatrixModel, false, this.Transform);
		
		if(this.material != null){
			for(let i = 0; i < this.material.params.length; ++i){
				this.material.params[i].setUniformToShader(shader);
			}
		}
		
		if(this.glVertexBuffer != -1 && shader.ALVertexPosition != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glVertexBuffer);
			gl.vertexAttribPointer(shader.ALVertexPosition, this.glVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexPosition);
		}
		
		if(this.glNormalBuffer != -1 && shader.ALVertexNormal != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glNormalBuffer);
			gl.vertexAttribPointer(shader.ALVertexNormal, this.glNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexNormal);
		}
		
		if(this.glTexCoordBuffer != -1 && shader.ALVertexTexCoord != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTexCoordBuffer);
			gl.vertexAttribPointer(shader.ALVertexTexCoord, this.glTexCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexTexCoord);
		}
		
		if(this.glTangentBuffer != -1 && shader.ALVertexTangent != -1){
			gl.bindBuffer(gl.ARRAY_BUFFER, this.glTangentBuffer);
			gl.vertexAttribPointer(shader.ALVertexTangent, this.glTangentBuffer.itemSize, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.ALVertexTangent);
		}
		
		if(this.blendMode != null)
			this.blendMode.Bind();
		
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndexBuffer);
		gl.drawElements( mode, this.glIndexBuffer.numItems, gl.UNSIGNED_INT, 0);
		
		if(this.blendMode != null)
			CBlendMode.Bind(CBlendMode.None);
	}
	
	RenderIndexedTriangles(shader){
		this.RenderIndexed(shader, gl.TRIANGLES);
	}	
	RenderIndexedTriangleStrip(shader){
		this.RenderIndexed(shader, gl.TRIANGLE_STRIP);
	}
	RenderIndexedTriangleFan(shader){
		this.RenderIndexed(shader, gl.TRIANGLE_FAN);
	}
	
	RenderIndexedLines(shader){
		this.RenderIndexed(shader, gl.LINES);
	}
	
	RenderIndexedPoints(shader){
		this.RenderIndexed(shader, gl.POINTS);
	}
}

class CModelImport
{	
	constructor(){
		this.VertexBuffer = [];
		this.VertexIndexBuffer = [];
		this.BinormalBuffer = [];
		this.BinormalIndexBuffer = [];
		this.TangentBuffer = [];
		this.TangentIndexBuffer = [];
		this.NormalBuffer = [];
		this.NormalIndexBuffer = [];
		this.TexCoordBuffer = [];
		this.TexCoordIndexBuffer = [];
		this.VertexType = "";
	}
	
	ImportOBJ(model, string){
		
		this.VertexBuffer.itemSize = 0;
		this.TexCoordBuffer.itemSize = 0;
		this.NormalBuffer.itemSize = 0;
		
		var lines = string.split("\n");
		for(var l = 0; l < lines.length; ++l){
			var line = lines[l]; line = line.trim();
			var elems = line.split(" ");
			
			var iOf = elems.indexOf("");
			while(iOf != -1){ elems.splice(iOf,1); iOf = elems.indexOf(""); }
			
			switch(elems[0]){
				case "v":{
					this.VertexBuffer[this.VertexBuffer.length] = vMath.vec3.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]),
						parseFloat(elems[3]));
					this.VertexBuffer.itemSize = 3;
					break;
				}
				case "vt":{
					this.TexCoordBuffer[this.TexCoordBuffer.length] = vMath.vec2.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]));
					this.TexCoordBuffer.itemSize = 2;
					break;
				}
				case "vn":{
					this.NormalBuffer[this.NormalBuffer.length] = vMath.vec3.fromValues(
						parseFloat(elems[1]),
						parseFloat(elems[2]),
						parseFloat(elems[3]));
					this.NormalBuffer.itemSize = 3;
					break;
				}
				case "f":{
					for(var e = 1; e <= 3; ++e){
						var subelems = elems[e].split("/");
						if(subelems.length == 1){
							this.VertexType = "v";
							this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
						}else if(subelems.length == 2){
							var texture = elems[e].indexOf("//") === -1;
							if(texture === 1){
								this.VertexType = "vt";
								this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
								this.TexCoordIndexBuffer[this.TexCoordIndexBuffer.length] = parseInt(subelems[1])-1;
							}else{
								this.VertexType = "vn";
								this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
								this.NormalIndexBuffer[this.NormalIndexBuffer.length] = parseInt(subelems[1])-1;
							}
						}else{
							this.VertexType = "vtn";
							this.VertexIndexBuffer[this.VertexIndexBuffer.length] = parseInt(subelems[0])-1;
							this.TexCoordIndexBuffer[this.TexCoordIndexBuffer.length] = parseInt(subelems[1])-1;
							this.NormalIndexBuffer[this.NormalIndexBuffer.length] = parseInt(subelems[2])-1;
						}
					}					
					break;
				}
			}
		
		}
		
		if(this.VertexType != "v"){
			for(var v = 0; v < this.VertexIndexBuffer.length; ++v){
				
				model.VertexBuffer[model.VertexBuffer.length] = this.VertexBuffer[this.VertexIndexBuffer[v]];
				
				if(this.VertexType == "vn"){
					model.NormalBuffer[model.NormalBuffer.length] = this.NormalBuffer[this.NormalIndexBuffer[v]];
				}else if(this.VertexType == "vt"){
					model.TexCoordBuffer[model.TexCoordBuffer.length] = this.TexCoordBuffer[this.TexCoordIndexBuffer[v]];
				}else if(this.VertexType == "vtn"){
					model.TexCoordBuffer[model.TexCoordBuffer.length] = this.TexCoordBuffer[this.TexCoordIndexBuffer[v]];
					model.NormalBuffer[model.NormalBuffer.length] = this.NormalBuffer[this.NormalIndexBuffer[v]];
				}
				
				model.IndexBuffer[model.IndexBuffer.length] = v;
			}
		}
		else{
			for(var f = 0; f < this.VertexIndexBuffer.length; ++f){
				model.IndexBuffer[model.IndexBuffer.length] = this.VertexIndexBuffer[f];
			}
			for(var v = 0; v < this.VertexBuffer.length; ++v){
				model.VertexBuffer[model.VertexBuffer.length] = this.VertexBuffer[v];
			}
		}
		
		model.VertexBuffer.itemSize = this.VertexBuffer.itemSize;
		model.NormalBuffer.itemSize = this.NormalBuffer.itemSize;
		model.TexCoordBuffer.itemSize = this.TexCoordBuffer.itemSize;
		
		model.VertexType = this.VertexType;	
		
	};
	
	//uzeto sa http://www.terathon.com/code/tangent.html
	CalcTangents(model){
		
		if(model.IndexBuffer.length <= 0) return false;
		if(model.TexCoordBuffer.length <= 0) return false;
		if(model.NormalBuffer.length <= 0) return false;
		
		var vertexCount = model.VertexBuffer.length;
		var faceCount = model.IndexBuffer.length;
		
		var tan1 = [];
		var tan2 = [];
		
		for(var i = 0; i < vertexCount; ++i){
			model.TangentBuffer[i] = vMath.vec3.create();
			tan1[i] = vMath.vec3.create();
			tan2[i] = vMath.vec3.create();
		}
		
		for(var f = 0; f < faceCount; f+=3){
			
			var ID0 = model.IndexBuffer[f+0];
			var ID1 = model.IndexBuffer[f+1];
			var ID2 = model.IndexBuffer[f+2];
			
			var v0 = model.VertexBuffer[ID0];
			var v1 = model.VertexBuffer[ID1];
			var v2 = model.VertexBuffer[ID2];
			var tx0 = model.TexCoordBuffer[ID0];
			var tx1 = model.TexCoordBuffer[ID1];
			var tx2 = model.TexCoordBuffer[ID2];
			
			var x1 = vMath.vec3.X(v1) - vMath.vec3.X(v0);
			var x2 = vMath.vec3.X(v2) - vMath.vec3.X(v0);
			var y1 = vMath.vec3.Y(v1) - vMath.vec3.Y(v0);
			var y2 = vMath.vec3.Y(v2) - vMath.vec3.Y(v0);
			var z1 = vMath.vec3.Z(v1) - vMath.vec3.Z(v0);
			var z2 = vMath.vec3.Z(v2) - vMath.vec3.Z(v0);
			
			var s1 = vMath.vec2.X(tx1) - vMath.vec2.X(tx0);
			var s2 = vMath.vec2.X(tx2) - vMath.vec2.X(tx0);
			var t1 = vMath.vec2.Y(tx1) - vMath.vec2.Y(tx0);
			var t2 = vMath.vec2.Y(tx2) - vMath.vec2.Y(tx0);
			
			var div = s1 * t2 - s2 * t1;
			if(Math.abs(div) <= 0.000001) div = (div < 0.0)? -0.000001 : 0.000001;
			
			var r = 1.0 / div;
			var sdir = vMath.vec3.fromValues((t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r, (t2 * z1 - t1 * z2) * r);
			var tdir = vMath.vec3.fromValues((s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r, (s1 * z2 - s2 * z1) * r);
			
			vMath.vec3.add(tan1[ID0], tan1[ID0], sdir);
			vMath.vec3.add(tan1[ID1], tan1[ID1], sdir);
			vMath.vec3.add(tan1[ID2], tan1[ID2], sdir);
			
			vMath.vec3.add(tan2[ID0], tan2[ID0], tdir);
			vMath.vec3.add(tan2[ID1], tan2[ID1], tdir);
			vMath.vec3.add(tan2[ID2], tan2[ID2], tdir);
			
		}
		
		for(var i = 0; i < vertexCount; ++i){
			
			var n = model.NormalBuffer[i];
			var t = tan1[i];
			
			var dNT = vMath.vec3.dot(n, t);
			var a = vMath.vec3.fromValues( vMath.vec3.X(t) - dNT*vMath.vec3.X(n),
									 vMath.vec3.Y(t) - dNT*vMath.vec3.Y(n),
									 vMath.vec3.Z(t) - dNT*vMath.vec3.Z(n) );
			
			var tangent = model.TangentBuffer[i];
			vMath.vec3.normalize(tangent, a);
			model.TangentBuffer[i] = tangent;			
		}
		
		model.TangentBuffer.itemSize = 3;
		
		// delete tan1; delete tan2;
		return true;
	}
}


export function GenCubeModel(model, min, max)
{
	if(min === undefined) min = -1.0;
	if(max === undefined) max =  1.0;
	
	model.VertexBuffer = [
				// Front face
				[min, min, max],
				[max, min, max],
				[max, max, max],
				[min, max, max],

				// Back face
				[min, min, min],
				[min, max, min],
				[max, max, min],
				[max, min, min],

				// Top face
				[min, max, min],
				[min, max, max],
				[max, max, max],
				[max, max, min],

				// Bottom face
				[min, min, min],
				[max, min, min],
				[max, min, max],
				[min, min, max],

				// Right face
				[max, min, min],
				[max, max, min],
				[max, max, max],
				[max, min, max],

				// Left face
				[min, min, min],
				[min, min, max],
				[min, max, max],
				[min, max, min],
			  ];
	model.VertexBuffer.itemSize = 3;
	
	model.NormalBuffer = [
				// Front face
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],

				// Back face
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],

				// Top face
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],

				// Bottom face
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],

				// Right face
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],

				// Left face
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
			  ];
	model.NormalBuffer.itemSize = 3;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
			4,  5,  6,      4,  6,  7,    // back
			8,  9,  10,     8,  10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23,   // left
		  ];

	model.VertexType = "vn";
	model.CreateBuffers();
	model.bIsLoaded = true;
}

export function GenQuadModel(model, min, max)
{
	if(min === undefined) min = -1.0;
	if(max === undefined) max =  1.0;
	
	model.VertexBuffer = [
				// Front face
				[min, min, 0.0],
				[max, min, 0.0],
				[max, max, 0.0],
				[min, max, 0.0],
				
			];
	model.VertexBuffer.itemSize = 3;
	
	model.TexCoordBuffer = [
				// Front face
				[ 0.0,  0.0],
				[ 1.0,  0.0],
				[ 1.0,  1.0],
				[ 0.0,  1.0],
			];
	model.TexCoordBuffer.itemSize = 2;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
		  ];

	model.VertexType = "vt";
	model.CreateBuffers();
	model.bIsLoaded = true;
}

var NDCQuadModel = null;
export function InitNDCQuadModel(){
	if(NDCQuadModel != null) return;
	
	NDCQuadModel = new CModel(-1);
	GenQuadModel(NDCQuadModel, -1, 1);
}

export { NDCQuadModel };