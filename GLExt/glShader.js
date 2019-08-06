import { gl, WriteDebug } from "./glContext.js";
	
function parseForIncludes(source){
	
	for(var i = source.indexOf("#include"); i != -1; i = source.indexOf("#include")){
		var istart = source.indexOf("\"",i);
		var iend = source.indexOf("\"",istart+1);
		
		var includeName = source.slice(istart+1,iend);
		
		var includeSource = getSourceFromFile(includeName, true) + " // ";
		source = source.replace("#include", includeSource);		
	}
	
	return source;
}

function parseForDefines(source, defines){
	
	var i = source.indexOf("#global_defines");
	if(i == -1) return source;
	source = source.replace("#global_defines", defines);
	return source;
}

function parseForLinesIncludingAll(source, keywords){
	
	var source2 = source.replace(/(?:\\[rn]|[\r\n]+)+/g, "\n");
	var sourceLines = source2.split("\n");
	var outLines = [];
	
	for(var l in sourceLines){
		var line = sourceLines[l];
		var hasAllKeywords = true;
		for(var k in keywords){
			var keyword = keywords[k];
			if(line.indexOf(keyword) == -1){ hasAllKeywords = false; break; }
		}
		
		if(hasAllKeywords == true)
			outLines[outLines.length] = line;
	}
	
	return outLines;
}

function parseForLinesIncludingAtLeastOne(source, keywords){
	
	var source2 = source.replace(/(?:\\[rn]|[\r\n]+)+/g, "\n");
	var sourceLines = source2.split("\n");
	var outLines = [];
	
	for(var l in sourceLines){
		var line = sourceLines[l];
		var hasKeyword = false;
		for(var k in keywords){
			var keyword = keywords[k];
			if(line.indexOf(keyword) != -1){ hasKeyword = true; break; }
		}
		
		if(hasKeyword == true)
			outLines[outLines.length] = line;
	}
	
	return outLines;
}
	
function getSourceFromFile(id, bParseForIncludes){
	var shaderScript = document.getElementById(id);
	if(shaderScript == null) return null;
	
	var source = "";
	var k = shaderScript.firstChild;
	
	if(k != null){
		while(k){
			if(k.nodeType == 3){ source += k.textContent; }
			k = k.nextSibling; }
	}
	else if(shaderScript.text != null){
		source = shaderScript.text;
	}
	else{ return null; }
	
	if(source.match(/[^\x00-\x7F]/g) != null){
		alert("source: " + id + " contains non ASCII: \n" + source.match(/[^\x00-\x7F]/g));
		source.replace(/[^\x00-\x7F]/g, "");
	}
	
	if(bParseForIncludes == true) source = parseForIncludes(source);
	
	return source;
}

function insertStringIntoSource(source, str, identifier){
	
	var i = source.indexOf(identifier);
	if(i != -1){
		source = source.replace(identifier, str);
	}
	return source;
}

var globalDefines = null;

export class CShaderDefines
{
	constructor(){
		this.defines = [];
	}
	
	addDefine(name, value){
		if(name == null) return;
		name = name.trim();
		if(name == "") return;
		
		if(value == null || value == "") value = " ";
		var str = "#define " + name + " " + value;
		this.defines.push(str);
	}
	
	getDefineId(name){
		if(name == null) return -1;
		name = name.trim();
		
		for(var i = 0; i < this.defines.length; ++i){
			var define = this.defines[i].split(" ");
			if(define.length < 2) continue;
			
			if(define[1].trim() == name){
				return i;
			}
		}
		return -1;
	}
	
	RemoveDefine(name){
		/* if(name == null) return false;
		name = name.trim();
		
		for(var i = 0; i < this.defines.length; ++i){
			var define = this.defines[i].split(" ");
			if(define.length < 2) continue;
			
			if(define[1].trim() == name){
				this.defines.splice(i,1);
				return true;
			}
		} */
		var i = this.getDefineId(name);
		if(i == -1) return false;
		this.defines.splice(i,1);
		return true;
	}
	
	HasDefine(name){
		return this.getDefineId(name) != -1;
	}
	
	static CreateGlobalDefines(){
		if(globalDefines == null) globalDefines = new CShaderDefines();
	}
	static getGlobalDefines(){
		CShaderDefines.CreateGlobalDefines();
		return globalDefines;
	}
	static addGlobalDefine(name, value){
		CShaderDefines.getGlobalDefines().addDefine(name,value);
	}
	
	getAsOneString(){
		var str = "";
		for(var i = 0; i < this.defines.length; ++i){
			str = str + this.defines[i] + "\n\r";
		}
		str = str + "\n\r";
		return str;
	}
	
	insertIntoSource(source, bGetGlobalDefines){
		var str = this.getAsOneString();
		if(bGetGlobalDefines == true)
			str = CShaderDefines.getGlobalDefines().getAsOneString() + str;
		return parseForDefines(source, str);
	}
	
	appendTo(other){
		for(var i = 0; i < this.defines.length; ++i)
			other.defines[other.defines.length] = this.defines[i];
	}
	copyTo(other){
		other.defines = [];
		for(var i = 0; i < this.defines.length; ++i)
			other.defines[i] = this.defines[i];
	}
	insertBefore(other){
		for(var i = this.defines.length-1; i >= 0; --i)
			other.defines.unshift(this.defines[i]);
	}
		
}

export class CFragDataLocation
{
	constructor(){
		this.name = "";
		this.location = -1;
	}
	
	set(n, l){ this.name = n; this.location = l; }
}

export class CUniformBlockBuffer
{
	constructor(){
		this.name = "";
		this.buffer = -1;
		this.data = null;
		this.size = 0;
	}
	
	Create(NofComponents16byte) //16byte = 4*float
	{
		this.size = 16*NofComponents16byte;
		if(this.buffer == -1) this.buffer = gl.createBuffer();
		if(this.data == null) this.data = new Uint8Array(this.size);		
		gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
		// gl.bufferData(gl.UNIFORM_BUFFER, this.size, this.data, gl.DYNAMIC_DRAW);
		gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	}
	
	setData(d){
		if(d.length % 16 != 0) return false;
		this.data = d;
		if(d.length != this.size){
			//ToDo: check if resize of this.buffer in OpenGL is needed
			this.size = d.length;
		}
		return true;
	}
	
	/*
	static ConvertTypedArray(src, type){
		var buffer = new ArrayBuffer(src.byteLength);
		var baseView = new src.constructor(buffer).set(src);
		return new type(buffer);
	}
	*/
	static ConvertTypedArray(){
		let blist = []; let blengths = []; let fullByteLength = 0;
		
		var type = arguments[arguments.length-1];
		
		for(let i = 0; i < arguments.length-1; ++i){
			let src = arguments[i]
			let b = new ArrayBuffer(src.byteLength);
			let baseView = new src.constructor(b).set(src);
			
			blist[blist.length] = new type(b);
			blengths[blengths.length] = src.byteLength;
			fullByteLength += src.byteLength;
		}
		
		let length = 0;
		var buffer = new type(new ArrayBuffer(fullByteLength));
		
		for(let i = 0; i < blist.length; ++i){
			let blength = blengths[i];
			let cpyfrom = blist[i];
			for(let b = 0; b < blength; ++b){
				buffer[length+b] = cpyfrom[b];
			}
			length += blength;
		}
		
		return buffer;
	}
	
	Update()
	{
		if(this.buffer == -1) return;
		if(this.data == null) return;
		
		gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
			gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	}
}

export class CUniformBlockBinding
{
		constructor(){
			this.name = "";
			this.bindPoint = -1;
			this.blockId = -1;
			this.buffer = null;
			this.shader = null;
		}
		
		Associate(shader, bindName, bindNumber, blockBuffer){
			this.name = bindName;
			this.bindPoint = bindNumber;
			this.blockId = gl.getUniformBlockIndex(shader.program, this.name);
			if(this.blockId == 4294967295) this.blockId = -1;
			this.buffer = blockBuffer;
			this.shader = shader;
			if(this.blockId == -1) return false;
			return true;
		}
		
		Bind(){
			if(this.shader == null) return;
			if(this.buffer == null) return;
			if(this.bindPoint == -1) return;
			if(this.blockId == -1) return;
			gl.uniformBlockBinding(this.shader.program, this.blockId, this.bindPoint);
			gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bindPoint, this.buffer.buffer);
		}
}

export class CShader
{
	constructor(slotID){
		
		this.SlotID = slotID;
		this.program = -1;
		this.vertex = -1;
		this.fragment = -1;
		
		this.strVertexSource = "";
		this.strFragmentSource = "";
		
		this.defines = new CShaderDefines();
		
		//AttribLocation
		this.ALVertexPosition = -1;
		this.ALVertexNormal = -1;
		this.ALVertexTangent = -1;
		this.ALVertexBinormal = -1;
		this.ALVertexTexCoord = -1;
		
		//UniformLocation
		this.ULMatrixProjection = -1;
		this.ULMatrixModel = -1;
		this.ULMatrixView = -1;
		
		//UniformLocation
		this.ULTextureD = -1;
		this.ULTextureAoRS = -1;
		this.ULTextureN = -1;
		this.ULTextureBRDF_LUT = -1;
		
		//UniformLocation
		this.ULFlags = -1;
		this.ULTime = -1;
		this.ULCameraPosition = -1;
		
		this.VertexShaderName = "-";
		this.FragmentShaderName = "-";
		
		this.UniformBlocks = [];
		this.FragDataLocations = [];
	}
	
	CreateAll(){
		if(this.vertex == -1) this.vertex = gl.createShader(gl.VERTEX_SHADER);
		if(this.fragment == -1) this.fragment = gl.createShader(gl.FRAGMENT_SHADER);
		if(this.program == -1) this.program = gl.createProgram();	
	}
	
	DeleteAll(){
		if(this.vertex != -1){
			if(this.program != -1) gl.detachShader(this.program, this.vertex);
			gl.deleteShader(this.vertex); this.vertex = -1;
		}
		if(this.fragment != -1){
			if(this.program != -1) gl.detachShader(this.program, this.fragment);
			gl.deleteShader(this.fragment); this.fragment = -1;
		}
		if(this.program != -1){
			gl.deleteProgram(this.program); this.program = -1;
		}
	}
	
	CompileVertexShader(code){
		gl.shaderSource(this.vertex, code);
		gl.compileShader(this.vertex);
		
		if(this.isCompiled(this.vertex) == false){
			WriteDebug(code);
			var error = this.getCompileErrorMessage(this.vertex);
			alert("vertex shader <"+this.VertexShaderName+">:\n" + error);
			return false;
		}
		return true;
	}
	
	CompileFragmentShader(code){
		gl.shaderSource(this.fragment, code);
		gl.compileShader(this.fragment);
		
		if(this.isCompiled(this.fragment) == false){
			WriteDebug(code);
			var error = this.getCompileErrorMessage(this.fragment);
			alert("fragment shader <"+this.FragmentShaderName+">:\n" + error);
			return false;
		}
		return true;
	}
	
	Compile(vertexCode, fragmentCode){
		
		this.CreateAll();
		
		this.CompileVertexShader(vertexCode);
		this.CompileFragmentShader(fragmentCode);
		
		gl.attachShader(this.program,this.vertex);
		gl.attachShader(this.program,this.fragment);
		gl.linkProgram(this.program);
		
		this.strVertexSource = vertexCode;
		this.strFragmentSource = fragmentCode;
		
		var bIsLinked = this.isLinked();
		
		if(bIsLinked == true){
			this.queryFragmentDataLocations(fragmentCode);
		}
		return bIsLinked;
	}
	
	CompileFromFile(vertexFile, fragmentFile){
		
		this.FragmentShaderName = fragmentFile;
		this.VertexShaderName = vertexFile;
		
		var vsSource = getSourceFromFile(vertexFile, true);
		if(vsSource == null) return false;
		var fsSource = getSourceFromFile(fragmentFile, true);
		if(fsSource == null) return false;
		
		vsSource = this.defines.insertIntoSource(vsSource, true);
		fsSource = this.defines.insertIntoSource(fsSource, true);
		
		this.strVertexSource = vsSource;
		this.strFragmentSource = fsSource;
		
		this.CreateAll();
		
		this.CompileVertexShader(vsSource);
		this.CompileFragmentShader(fsSource);
		
		gl.attachShader(this.program,this.vertex);
		gl.attachShader(this.program,this.fragment);
		gl.linkProgram(this.program);
		
		var bIsLinked = this.isLinked();
		
		if(bIsLinked == true){
			this.queryFragmentDataLocations(fsSource);
		}
		return bIsLinked;
	}
	
	Recompile(bClearDefines){
		
		if(bClearDefines == true)
			this.defines = new CShaderDefines();
		
		//AttribLocation
		this.ALVertexPosition = -1;
		this.ALVertexNormal = -1;
		this.ALVertexTangent = -1;
		this.ALVertexBinormal = -1;
		this.ALVertexTexCoord = -1;
		
		//UniformLocation
		this.ULMatrixProjection = -1;
		this.ULMatrixModel = -1;
		this.ULMatrixView = -1;
		
		//UniformLocation
		this.ULTextureD = -1;
		this.ULTextureAoRS = -1;
		this.ULTextureN = -1;
		this.ULTextureBRDF_LUT = -1;
		
		//UniformLocation
		this.ULFlags = -1;
		this.ULTime = -1;
		this.ULCameraPosition = -1;
		
		this.DeleteAll();
		
		return this.CompileFromFile(this.VertexShaderName, this.FragmentShaderName);
	}
	
	getUniformBlockID(name){
		for(var i = 0; i < this.UniformBlocks.length; ++i){
			if(name == this.UniformBlocks[i].name)
				return i;
		}
		return -1;
	}
	getUniformBlock(name){
		var i = this.getUniformBlockID(name);
		if(i == -1) return null;
		return this.UniformBlocks[i];
	}
	getUniformBlockBindingPoint(name){
		return this.getUniformBlockID(name);
	}
	
	BindUniformBlocks(){
		for(var i = 0; i < this.UniformBlocks.length; ++i){
			if(this.UniformBlocks[i] != null)
				this.UniformBlocks[i].Bind();
		}
	}
	
	addUniformBlock(name, buffer){
		var binding = new CUniformBlockBinding();
		
		var slot = this.getUniformBlockID(name);
		if(slot == -1)
			slot = this.UniformBlocks.length;
		
		this.UniformBlocks[slot] = binding;
		binding.Associate(this, name, slot, buffer);
	}
	
	isCompiled(shader){
		if(gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0){
			return false;
		}
		return true;
	}
	
	getCompileErrorMessage(shader){
		if(this.isCompiled(shader) == true){ return "Compile successfull!"; }
		var error = gl.getShaderInfoLog(shader);
		if(error.length <= 0){ return "Error log empty"; }
		return error;
	}
	
	isLinked(){
		if(gl.getProgramParameter(this.program, gl.LINK_STATUS) == 0){
			return false;
		}
		return true;
	}
		
	addDefine(name, value){
		this.defines.addDefine(name, value);
	}
	
	RemoveDefine(name){
		this.defines.RemoveDefine(name);
	}
	RemoveAllDefines(){
		this.defines = new CShaderDefines();		
	}
	
	setVertexAttribLocations(position, normal, tangent, binormal, texture){
		
		if(this.program == null) return false;
		// if(this.isBound() == false) this.Bind();
		
		this.ALVertexPosition = -1;
		this.ALVertexNormal = -1;
		this.ALVertexTangent = -1;
		this.ALVertexBinormal = -1;
		this.ALVertexTexCoord = -1;
		
		if(typeof position !== 'undefined' && position != null)
			this.ALVertexPosition = gl.getAttribLocation(this.program, position);
		if(typeof normal !== 'undefined' && normal != null)
			this.ALVertexNormal = gl.getAttribLocation(this.program, normal);
		if(typeof tangent !== 'undefined' && tangent != null)
			this.ALVertexTangent = gl.getAttribLocation(this.program, tangent);
		if(typeof binormal !== 'undefined' && binormal != null)
			this.ALVertexBinormal = gl.getAttribLocation(this.program, binormal);
		if(typeof texture !== 'undefined' && texture != null)
			this.ALVertexTexCoord = gl.getAttribLocation(this.program, texture);
		
		return true;
	}
	
	setTransformMatricesUniformLocation(model, view, projection){
		
		if(this.program == null) return false;
		// if(this.isBound() == false) this.Bind();
		
		this.ULMatrixProjection = -1;
		this.ULMatrixModel = -1;
		this.ULMatrixView = -1;
		
		if(typeof projection !== 'undefined' && projection != null)
			this.ULMatrixProjection = gl.getUniformLocation(this.program, projection);
		if(typeof model !== 'undefined' && model != null)
			this.ULMatrixModel = gl.getUniformLocation(this.program, model);
		if(typeof view !== 'undefined' && view != null)
			this.ULMatrixView = gl.getUniformLocation(this.program, view);
		
		if(this.ULMatrixProjection == null) this.ULMatrixProjection = -1;
		if(this.ULMatrixModel == null) this.ULMatrixModel = -1;
		if(this.ULMatrixView == null) this.ULMatrixView = -1;
		
		return true;
	}
	
	setViewMatrixUniform(viewMatrix){
		if(this.ULMatrixView == undefined || this.ULMatrixView == -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
        gl.uniformMatrix4fv(this.ULMatrixView, false, viewMatrix); return true;
	}
	
	setProjectionMatrixUniform(projectionMatrix){
		if(this.ULMatrixProjection == undefined || this.ULMatrixProjection == -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
        gl.uniformMatrix4fv(this.ULMatrixProjection, false, projectionMatrix); return true;
	}
	
	
	setMatrix4Uniform(uniform_location, matrix){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
        gl.uniformMatrix4fv(uniform_location, false, matrix); return true;
	}
	setMatrix3Uniform(uniform_location, matrix){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
        gl.uniformMatrix3fv(uniform_location, false, matrix); return true;
	}
	setIntUniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform1i(uniform_location, value); return true;
	}
	setInt2Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform2iv(uniform_location, value); return true;
	}
	setInt3Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform3iv(uniform_location, value); return true;
	}
	setInt4Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform4iv(uniform_location, value); return true;
	}
	setFloatUniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform1f(uniform_location, value); return true;
	}
	setFloat2Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform2f(uniform_location, value[0],value[1]); return true;
	}
	setFloat3Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform3f(uniform_location, value[0],value[1],value[2]); return true;
	}
	setFloat4Uniform(uniform_location, value){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform4f(uniform_location, value[0],value[1],value[2],value[3]); return true;
	}
	
	setFloatUniformArray(uniform_location, values){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform1fv(uniform_location, values); return true;
	}
	setFloat2UniformArray(uniform_location, values){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform2fv(uniform_location, values); return true;
	}
	setFloat3UniformArray(uniform_location, values){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform3fv(uniform_location, values); return true;
	}
	setFloat4UniformArray(uniform_location, values){
		if(uniform_location == null ||uniform_location === -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform4fv(uniform_location, values); return true;
	}
	
	setDefaultTextureUniformLocations(Diffuse, Normal, AoRS){
		
		if(this.program == null) return false;		
		
		this.ULTextureD = -1;
		this.ULTextureN = -1;
		this.ULTextureAoRS = -1;
		
		if(typeof Diffuse !== 'undefined' && Diffuse != null)
			this.ULTextureD = gl.getUniformLocation(this.program, Diffuse);
		if(typeof Normal !== 'undefined' && Normal != null)
			this.ULTextureN = gl.getUniformLocation(this.program, Normal);
		if(typeof AoRS !== 'undefined' && AoRS != null)
			this.ULTextureAoRS = gl.getUniformLocation(this.program, AoRS);
		
		if(this.ULTextureD == null) this.ULTextureD == -1;
		if(this.ULTextureN == null) this.ULTextureN == -1;
		if(this.ULTextureAoRS == null) this.ULTextureAoRS == -1;
		
		return true;
	}	
	
	setBRDFLUTTextureUniformLocation(BRDFLUT){
		
		if(this.program == null) return false;		
		
		this.ULTextureBRDF_LUT = -1;
		
		if(typeof BRDFLUT !== 'undefined' && BRDFLUT != null)
			this.ULTextureBRDF_LUT = gl.getUniformLocation(this.program, BRDFLUT);
		
		if(this.ULTextureBRDF_LUT == null) this. ULTextureBRDF_LUT = -1;
		
		return true;
	}
	
	setFlagsUniformLocation(Flags){
		
		if(this.program == null) return false;

		this.ULFlags = -1;
		
		if(typeof Flags !== 'undefined' && Flags != null)
			this.ULFlags = gl.getUniformLocation(this.program, Flags);
		else return false;
		
		if(this.ULFlags == null) this.ULFlags = -1;
		
		return true;
	}
	
	setTimeUniformLocation(Time){
		
		if(this.program == null) return false;
		
		this.ULTime = -1;
		
		if(typeof Time !== 'undefined' && Time != null)
			this.ULTime = gl.getUniformLocation(this.program, Time);
		else return false;
		
		if(this.ULTime == null) this.ULTime = -1;
		
		return true;
	}
	
	setCameraPositionUniformLocation(CameraPosition){
		
		if(this.program == null) return false;
		
		this.ULCameraPosition = -1;
		
		if(typeof CameraPosition !== 'undefined' && CameraPosition != null)
			this.ULCameraPosition = gl.getUniformLocation(this.program, CameraPosition);
		else return false;
		
		if(this.ULCameraPosition == null) this.ULCameraPosition = -1;
		
		return true;
		
	}
	
	getPrefetchedUniformLocation(str){
		switch(str){
			case "ModelMatrix": return this.ULMatrixModel;
			case "ViewMatrix": return this.ULMatrixView;
			case "ProjectionMatrix": return this.ULMatrixProjection;
			case "txDiffuse": return this.ULTextureD;
			case "txNormal": return this.ULTextureN;
			case "txAoRS": return this.ULTextureAoRS;
			case "txBRDF_LUT": return this.ULTextureBRDF_LUT;
			case "CameraPosition": return this.ULCameraPosition;
			case "uFlags": return this.ULFlags;
			case "Time": return this.ULTime;
			default: return this.getUniformLocation(str);
		}		
		return -1;
	}
	
	InitDefaultUniformLocations(){
		this.setTransformMatricesUniformLocation("ModelMatrix","ViewMatrix","ProjectionMatrix");
		this.setDefaultTextureUniformLocations("txDiffuse","txNormal","txAoRS");
		this.setCameraPositionUniformLocation("CameraPosition");
		this.setBRDFLUTTextureUniformLocation("txBRDF_LUT");
		this.setFlagsUniformLocation("uFlags");
		this.setTimeUniformLocation("Time");
	}
	InitDefaultAttribLocations(){
		this.setVertexAttribLocations("aVertexPosition","aVertexNormal","aVertexTangent","aVertexBinormal","aTexCoords");
	}
	
	setFlagsUniform(Flags){
		if(this.ULFlags == undefined || this.ULFlags == -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform1i(this.ULFlags, Flags);
		
		return true;
	}
	
	setTimeUniform(Time){
		if(this.ULTime == undefined || this.ULTime == -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform1f(this.ULTime, Time);
		
		return true;
	}
	
	setCameraPositionUniform(Position){
		if(this.ULCameraPosition == undefined || this.ULCameraPosition == -1) return false;
		if(this.program == null) return false;
		if(this.isBound() == false) this.Bind();
		
		gl.uniform3f(this.ULCameraPosition, Position[0], Position[1], Position[2]);
		
		return true;		
	}
	
	getUniformLocation(UniformName){
		if(this.program == null) return null;
		var rtn = gl.getUniformLocation(this.program, UniformName);
		if(rtn == null) return -1;
		return rtn;
	}
	getAttribLocation(AttribLocation){
		if(this.program == null) return null;
		return gl.getAttribLocation(this.program, AttribLocation);
	}
	
	Bind(){
		gl.useProgram(this.program); gl.currentShaderProgram = this.program;
		this.BindUniformBlocks();
	}
	
	Unbind(){
		gl.useProgram(null); gl.currentShaderProgram = null;
	}
	
	isBound(){ return this.program === gl.currentShaderProgram; }
	
	getFragDataLocations(){
		return this.FragDataLocations;
	}
	
	queryFragmentDataLocations(source){
		
		let lines = parseForLinesIncludingAtLeastOne(source, ["out","layout","location"]);
		
		let potentialOutputs = [];
		let outputs = [];
				
		for(let l in lines){
			let line = lines[l];
			line = line.replace(";", " ");
			line = line.replace("\t"," ");
			let words = line.split(" ");
			
			let words2 = words.filter(function(el){
				return el != null && el != "" && el != '';
			});
			
			potentialOutputs[potentialOutputs.length] = words2[words2.length-1];
		}
		
		for(let o in potentialOutputs){
			let output = potentialOutputs[o];
			let loc = gl.getFragDataLocation(this.program, output);
			
			if(loc != -1){
				let fragDataLoc = new CFragDataLocation();
				fragDataLoc.set(output, loc);
				this.FragDataLocations[this.FragDataLocations.length] = fragDataLoc;
			}
		}
		
		//ckeck for duplicated
		for(let i = 0; i < this.FragDataLocations.length; ++i){
			let loc = this.FragDataLocations[i];
			
			for(let j = i+1; j < this.FragDataLocations.length; ++j){
				let loc2 = this.FragDataLocations[j];
				
				if(loc.location == loc2.location){
					loc2.location = -1;
				}
			}
		}
		//remove duplicated
		this.FragDataLocations = this.FragDataLocations.filter(function (el){ return el.location != -1; });
		//sort the array
		this.FragDataLocations.sort(function(a, b){ return a.location - b.location; });
	}
}

var globalShaderList = null;

export class CShaderList
{
	constructor(){
		this.shaders = [];
	}
	
	static CreateShader(vertexFile, fragmentFile){
		var SlotID = CShaderList.singleton().shaders.length;
		var shader = new CShader(SlotID);
		shader.CompileFromFile(vertexFile,fragmentFile);
		CShaderList.singleton().shaders[SlotID] = shader;
		return shader;
	}
	
	static addShader(shader){
		shader.SlotID = CShaderList.singleton().shaders.length;
		CShaderList.singleton().shaders[CShaderList.singleton().shaders.length] = shader;
	}
	
	static Init(){
		if(globalShaderList == null)
			globalShaderList = new CShaderList();
	}
	
	static get(SlotID){
		if(SlotID < CShaderList.singleton().shaders.length){
			return CShaderList.singleton().shaders[SlotID];
		}
		return null;
	}
	
	static getAllWithName(name){
		if(name == null) return null;
		if(name == "") return null;
		
		var rtnList = [];
		var shaderList = CShaderList.singleton();
		
		for(var i = 0; i < shaderList.shaders.length; ++i){
			var shader = shaderList.shaders[i];
			if(shader.FragmentShaderName == name || shader.VertexShaderName == name){
				rtnList[rtnList.length] = shader;
			}
		}
		
		return rtnList;
	}
	
	static count(){
		return CShaderList.singleton().shaders.length;
	}
	
	static singleton(){
		CShaderList.Init();
		return globalShaderList;
	}
}

export * from "./glShader.js";