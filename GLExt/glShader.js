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

export class ShaderDefines
{
	constructor(){
		this.defines = [];
	}
	
	addDefine(name, value){
		if(name == null) return;
		if(value == null || value == "") value = " ";
		var str = "#define " + name + " " + value;
		this.defines.push(str);
	}
	
	RemoveDefine(name){
		if(name == null) return false;
		name = name.trim();
		
		for(var i = 0; i < this.defines.length; ++i){
			var define = this.defines[i].split(" ");
			if(define.length < 2) continue;
			
			if(define[1].trim() == name){
				this.defines.splice(i,1);
				return true;
			}
		}
		return false;
	}
	
	static CreateGlobalDefines(){
		if(globalDefines == null) globalDefines = new ShaderDefines();
	}
	static getGlobalDefines(){
		ShaderDefines.CreateGlobalDefines();
		return globalDefines;
	}
	static addGlobalDefine(name, value){
		ShaderDefines.getGlobalDefines().addDefine(name,value);
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
			str = ShaderDefines.getGlobalDefines().getAsOneString() + str;
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

export class UniformBlockBuffer
{
	constructor(){
		this.name = "";
		this.buffer = -1;
		this.data = null;
		this.size = 0;
	}
	
	Create(NofComponents16bit)
	{
		this.size = 16*NofComponents16bit;
		if(this.buffer == -1) this.buffer = gl.createBuffer();
		if(this.data == null) this.data = new Uint8Array(this.size);		
		gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
		// gl.bufferData(gl.UNIFORM_BUFFER, this.size, this.data, gl.DYNAMIC_DRAW);
		gl.bufferData(gl.UNIFORM_BUFFER, this.data, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	}
	
	static ConvertTypedArray(src, type){
		var buffer = new ArrayBuffer(src.byteLength);
		var baseView = new src.constructor(buffer).set(src);
		return new type(buffer);
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

export class UniformBlockBinding
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
			this.buffer = blockBuffer;
			this.shader = shader;
		}
		
		Bind(){
			if(this.shader == null) return;
			if(this.buffer == null) return;
			if(this.bindPoint == -1) return;
			gl.uniformBlockBinding(this.shader.program, this.blockId, this.bindPoint);
			gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bindPoint, this.buffer.buffer);
		}
}

export class Shader
{
	constructor(slotID){
		
		this.SlotID = slotID;
		this.program = -1;
		this.vertex = -1;
		this.fragment = -1;
		
		this.strVertexSource = "";
		this.strFragmentSource = "";
		
		this.defines = new ShaderDefines();
		
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

		return this.isLinked();
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

		return this.isLinked();
	}
	
	Recompile(bClearDefines){
		
		if(bClearDefines == true)
			this.defines = new ShaderDefines();
		
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
		var binding = new UniformBlockBinding();
		
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
	
	setVertexAttribLocations(position, normal, tangent, binormal, texture){
		
		if(this.program == null) return false;
		// if(this.isBinded() == false) this.Bind();
		
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
		// if(this.isBinded() == false) this.Bind();
		
		this.ULMatrixProjection = -1;
		this.ULMatrixModel = -1;
		this.ULMatrixView = -1;
		
		if(typeof projection !== 'undefined' && projection != null)
			this.ULMatrixProjection = gl.getUniformLocation(this.program, projection);
		if(typeof model !== 'undefined' && model != null)
			this.ULMatrixModel = gl.getUniformLocation(this.program, model);
		if(typeof view !== 'undefined' && view != null)
			this.ULMatrixView = gl.getUniformLocation(this.program, view);
		
		return true;
	}
	
	setViewMatrixUniform(viewMatrix){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
        gl.uniformMatrix4fv(this.ULMatrixView, false, viewMatrix);
	}
	
	setProjectionMatrixUniform(projectionMatrix){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
        gl.uniformMatrix4fv(this.ULMatrixProjection, false, projectionMatrix);
	}
	
	
	setMatrix4Uniform(uniform_location, matrix){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
        gl.uniformMatrix4fv(uniform_location, false, matrix);
	}
	setMatrix3Uniform(uniform_location, matrix){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
        gl.uniformMatrix3fv(uniform_location, false, matrix);
	}
	setIntUniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform1i(uniform_location, value);
	}
	setInt2Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform2iv(uniform_location, value);
	}
	setInt3Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform3iv(uniform_location, value);
	}
	setInt4Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform4iv(uniform_location, value);
	}
	setFloatUniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform1f(uniform_location, value);
	}
	setFloat2Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform2f(uniform_location, value[0],value[1]);
	}
	setFloat3Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform3f(uniform_location, value[0],value[1],value[2]);
	}
	setFloat4Uniform(uniform_location, value){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform4f(uniform_location, value[0],value[1],value[2],value[3]);
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
		
		return true;
	}	
	
	setBRDFLUTTextureUniformLocation(BRDFLUT){
		
		if(this.program == null) return false;		
		
		this.ULTextureBRDF_LUT = -1;
		
		if(typeof BRDFLUT !== 'undefined' && BRDFLUT != null)
			this.ULTextureBRDF_LUT = gl.getUniformLocation(this.program, BRDFLUT);
		
		return true;
	}
	
	setFlagsUniformLocation(Flags){
		
		if(this.program == null) return false;		
		
		if(typeof Flags !== 'undefined' && Flags != null)
			this.ULFlags = gl.getUniformLocation(this.program, Flags);
		else return false;
		
		return true;
	}
	
	setTimeUniformLocation(Time){
		
		if(this.program == null) return false;
		
		if(typeof Time !== 'undefined' && Time != null)
			this.ULTime = gl.getUniformLocation(this.program, Time);
		else return false;
		
		return true;
	}
	
	setCameraPositionUniformLocation(CameraPosition){
		
		if(this.program == null) return false;
		
		if(typeof CameraPosition !== 'undefined' && CameraPosition != null)
			this.ULCameraPosition = gl.getUniformLocation(this.program, CameraPosition);
		else return false;
		
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
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform1i(this.ULFlags, Flags);
		
		return true;
	}
	
	setTimeUniform(Time){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform1f(this.ULTime, Time);
		
		return true;
	}
	
	setCameraPositionUniform(Position){
		if(this.program == null) return false;
		if(this.isBinded() == false) this.Bind();
		
		gl.uniform3f(this.ULCameraPosition, Position[0], Position[1], Position[2]);
		
		return true;		
	}
	
	getUniformLocation(UniformName){
		if(this.program == null) return null;
		return gl.getUniformLocation(this.program, UniformName);
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
	
	isBinded(){ return this.program === gl.currentShaderProgram; }
}

var globalShaderList = null;

export class ShaderList
{
	constructor(){
		this.shaders = [];
	}
	
	static CreateShader(vertexFile, fragmentFile){
		var SlotID = ShaderList.singleton().shaders.length;
		var shader = new Shader(SlotID);
		shader.CompileFromFile(vertexFile,fragmentFile);
		ShaderList.singleton().shaders[SlotID] = shader;
		return shader;
	}
	
	static addShader(shader){
		shader.SlotID = ShaderList.singleton().shaders.length;
		ShaderList.singleton().shaders[ShaderList.singleton().shaders.length] = shader;
	}
	
	static Init(){
		if(globalShaderList == null)
			globalShaderList = new ShaderList();
	}
	
	static get(SlotID){
		if(SlotID < ShaderList.singleton().shaders.length){
			return ShaderList.singleton().shaders[SlotID];
		}
		return null;
	}
	
	static count(){
		return ShaderList.singleton().shaders.length;
	}
	
	static singleton(){
		ShaderList.Init();
		return globalShaderList;
	}
}

export * from "./glShader.js";