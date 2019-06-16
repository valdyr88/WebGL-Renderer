import { gl, glPrintError } from "./glContext.js";
// import * as global from "./globalStorage.js"
import * as sys from "./../System/sys.js"

function ubyte2sbyte(ubyte){
	if(ubyte > 0x80) return -(0x80 - (ubyte - 0x80));
	else return (ubyte);
}

function splitFilePathExt(strPath){
	var dt = strPath.lastIndexOf(".");
	return [strPath.substring(0,dt),strPath.substring(dt+1)];
}

//returns object: {type, usage, resolution, isHDR, isInZip, hasMips }
function getTextureTypeFromDOMType(strType)
{
	var types = strType.split("/");
	var strUsage = ((types.length > 1)? types[1] : "");
	var res = -1; var bHasMips = false;
	
	if(strUsage != "")
	{
		usages = strUsage.split(":");
		for(var i = 0; i < usages.length; ++i)
			if(isNaN(parseInt(usages[i])) == false){
				res = parseInt(usages[i]); bHasMips = true; break;
			}
	}
	
	var out = { type		: types[0],
				usage		: strUsage,
				resolution	: res,
				isHDR		: types.indexOf("hdr") != -1, 
				isInZip		: types.indexOf("zip") != -1,
				hasMips		: types.indexOf("mips")!= -1 || bHasMips,
			  };
	return out;
}

export class CHDRImage{

	constructor(data){		
		this.rawData = data;//new Uint8Array();
		this.floatData = null;//new Float32Array();
		this.width = 0;
		this.height = 0;
		this.dataStart = 0;
		
		this.X = 0;
		this.Y = 0;
		this.bSwappedXY = false;
		this.bDecoded = false;
	}
	
	getWidth(){ return this.width; }
	getHeight(){ return this.height; }
	
	static DecodeHDRIPixel(r,g,b,e){
		e = e-128; //exponent
		var mult = Math.pow(2.0, e);
		
		r = mult*r/255.0;
		g = mult*g/255.0;
		b = mult*b/255.0;
		
		return [r,g,b];
	}
		
	static DecodeHDRImageToFloatArray(data, dataStart, width, height){
		var NofPixels = width*height;
		var floatArray = new Float32Array(3*NofPixels);		
		
		var i = dataStart; //data
		var scanLineNo = 0;
		var currPix = 0;
		
		var Unp = [new Uint8Array(width), new Uint8Array(width), new Uint8Array(width), new Uint8Array(width)];
		
		if(data[i+0] == 2 && data[i+1] == 2) //Adaptive RLE
		{
			for(i = dataStart; i < data.length; )
			{	
				var scanLineLength = 0;
				if(data[i+0] == 2 && data[i+1] == 2){ scanLineLength = data[i+2]*Math.pow(2,8)+data[i+3]; ++scanLineNo; } 
				else{ 
					alert("DecodeHDRImageToFloatArray() scanLine missalignment!"); break; }
				i += 4;
				
				if(scanLineLength != width){
					alert("DecodeHDRImageToFloatArray() scanLineLength != width"); break; }
					
				++scanLineNo;
				
				var iUnp = [0,0,0,0];
				
				//adaptive rle dekodiranje, odvojeni RGBE po kanalu (prvo cijeli R scanline, pa G, ...)
				for(var Dim = 0; Dim < 4; ++Dim){
					
					while(i < data.length && iUnp[Dim] < width){
						var rle = data[i]; ++i;
						
						if(rle > 0x80){
							rle &= 0x7f;
							var val = data[i]; ++i;
							while(rle-- != 0){
								Unp[Dim][iUnp[Dim]] = val; ++iUnp[Dim];
							}
						}
						else{
							while(rle-- != 0){
								Unp[Dim][iUnp[Dim]] = data[i]; ++iUnp[Dim]; ++i;
							}
						}
					}
				}
				
				if((iUnp[0] == iUnp[1] && iUnp[0] == iUnp[2] && iUnp[0] == iUnp[3]) == false){
					alert("DecodeHDRImageToFloatArray() component scanline width not matching!");}
				
				for(var p = 0; p < width; ++p){
					var rgbf = CHDRImage.DecodeHDRIPixel(Unp[0][p], Unp[1][p], Unp[2][p], Unp[3][p]);
					floatArray[3*currPix+0] = rgbf[0];
					floatArray[3*currPix+1] = rgbf[1];
					floatArray[3*currPix+2] = rgbf[2];
					++currPix;
				}
				
				if(currPix > NofPixels){
					alert("DecodeHDRImageToFloatArray() currPix > NofPixels"); break; }
			}
		}
		else //RAW dump or ordinary RLE
		{
			if((data.length-dataStart) % 4 != 0){
				alert("DecodeHDRImageToFloatArray() data.length % 4 != 0"); }
			
			for(i = dataStart; i < data.length; )
			{
				var rgbf = CHDRImage.DecodeHDRIPixel(data[i+0], data[i+1], data[i+2], data[i+3]); i+=4;
				
				var rle = 0;
				if(i+4 < data.length){ //check for rle repeating of the prev pixel
					var c = 0;
					while(true){ //consecutive repeat indicators contain higher-order bytes of the count.
						if(data[i+0] == 1 && data[i+1] == 1 && data[i+2] == 1)
						{
							rle += Math.pow(256,c)*(data[i+3]+1);
							++c; i+=4;
						}
						else break;
					}
				}
				if(rle == 0) rle = 1; //if there were no rle repeating indicators, then we write 1 pixel
				
				for(var r = 0; r < rle; ++r){
					floatArray[3*currPix+0] = rgbf[0];
					floatArray[3*currPix+1] = rgbf[1];
					floatArray[3*currPix+2] = rgbf[2];
					++currPix;
				}
				
				if(currPix > NofPixels){
					alert("DecodeHDRImageToFloatArray() currPix > NofPixels"); break; }
			}
		}
		
		return floatArray;
	}
	
	OpenFileFromServer(fileName){
		var oReq = new XMLHttpRequest();
		oReq.open("GET", fileName, true);
		oReq.responseType = "arraybuffer";
		
		oReq.onload = function(oEvent){
			
			var arrayBuffer = oReq.response;
			if(arrayBuffer){
				this.rawData = new Uint8Array(arrayBuffer);
			}
		}
	}
	
	setRawData(data){ this.rawData = data; }
	getData(){ 
		if(this.isReady() == true) return this.floatData;
		else return null;
	}
	
	isReady(){ return this.bDecoded; }
	
	DecodeRAWData(){
		if(this.rawData == null) return false;		
		
		var binRadiance = this.rawData.slice(0,10);		
		// var strRadiance = new TexDecoder("utf-8").decode(binRadiance);
		var strRadiance = String.fromCharCode.apply(null,binRadiance);
		
		if(strRadiance == null) return false;
		if(strRadiance != "#?RADIANCE") return false;
		
		var headerSize = 0;
		for(headerSize = 0; headerSize < this.rawData.length-1; ++headerSize){
			if(this.rawData[headerSize] == 10 && this.rawData[headerSize+1] == 10) break;}
		++headerSize;++headerSize;
		
		this.dataStart = headerSize+1;
		for(this.dataStart = headerSize+1; this.dataStart < this.rawData.length; ++this.dataStart){
			if(this.rawData[this.dataStart] == 10) break;}
		++this.dataStart;
		
		var binResolution = this.rawData.slice(headerSize, this.dataStart);
		// var strResolution = new TexDecoder("utf-8").decode(binResolution);
		var strResolution = String.fromCharCode.apply(null,binResolution);
		
		if(strResolution == null) return false;
		
		var strResolutionArray = strResolution.split(" ");
		for(var i = 0; i < 2; ++i){
			switch(strResolutionArray[i*2]){
				case "+X": this.width = parseInt(strResolutionArray[i*2+1]); this.X =  1; this.bSwappedXY = (i == 0); break;
				case "-X": this.width = parseInt(strResolutionArray[i*2+1]); this.X = -1; this.bSwappedXY = (i == 0); break;
				case "+Y": this.height= parseInt(strResolutionArray[i*2+1]); this.Y =  1; break;
				case "-Y": this.height= parseInt(strResolutionArray[i*2+1]); this.Y = -1; break;
			}
		}
				
		this.floatData = CHDRImage.DecodeHDRImageToFloatArray(this.rawData, this.dataStart, this.width, this.height);
		this.bDecoded = true;
		
		return true;
	}
}

/* 
GL_NEAREST - no filtering, no mipmaps
GL_LINEAR - filtering, no mipmaps
GL_NEAREST_MIPMAP_NEAREST - no filtering, sharp switching between mipmaps
GL_NEAREST_MIPMAP_LINEAR - no filtering, smooth transition between mipmaps
GL_LINEAR_MIPMAP_NEAREST - filtering, sharp switching between mipmaps
GL_LINEAR_MIPMAP_LINEAR - filtering, smooth transition between mipmaps

So:
GL_LINEAR is bilinear
GL_LINEAR_MIPMAP_NEAREST is bilinear with mipmaps
GL_LINEAR_MIPMAP_LINEAR is trilinear
 */
	
export function CalcNofMipLevels(width, height){
	//floor(log2(max(width,height)))+1
	var dim = Math.max(width, height);
	var levels = Math.log(dim) / Math.log(2.0);
	var ilevels = Math.floor(levels) + 1;
	return ilevels;
}

export class CTexture{
	
	constructor(slotID){
		this.init();
		this.SlotID = slotID;
	}
	
	init(){
		this.SlotID = -1;
		this.Type = "tx2D";
		this.texture = -1;
		this.activeSlot = -1;
		this.targetType = gl.TEXTURE_2D;
		this.width = 0;
		this.height = 0;
		this.levels = 1;
		this.format = -1;
		this.internalFormat = -1;
		this.type = -1;
		this.name = "-";
		this.scr = "";
	}
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
		
	CreateWithDefaultParams(tx){
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		// if(this.targetType == gl.TEXTURE_2D)
			gl.texImage2D(this.targetType, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tx);
		// else if(this.targetType == gl.TEXTURE_3D);
			gl.generateMipmap(this.targetType);
		
		gl.bindTexture(this.targetType, null);
		
		if( !(typeof tx.width === 'undefined') && !(typeof tx.height === 'undefined')){
			this.width = tx.width; this.height = tx.height;
			this.levels = CalcNofMipLevels(this.width,this.height);
		}
		
		this.src = tx.src;
	}
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
	
	CreateDelayed(tx_src){
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
			gl.texImage2D(this.type, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
				
		gl.bindTexture(this.targetType, null);
		
		this.width = 1; this.height = 1; this.levels = 1;
		
		const tx = new Image();
		tx.onload = function(){
			gl.bindTexture(this.targetType, this.texture);
			
				gl.texImage2D(this.targetType, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tx);
				gl.generateMipmap(this.targetType);
		
			gl.bindTexture(this.targetType, null);
			
			if( !(typeof tx.width === 'undefined') && !(typeof tx.height === 'undefined')){
				this.width = tx.width; this.height = tx.height;
				this.levels = CalcNofMipLevels(this.width,this.height);
			}
		}
		tx.src = tx_src;
		this.src = tx_src;
	}
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
		
	CreateEmpty(width, height, internalFormat, format, type){		
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //_MIPMAP_LINEAR LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		gl.texImage2D(this.targetType, 0, internalFormat, width, height, 0, format, type, null);
		glPrintError();
		
		gl.bindTexture(this.targetType, null);
		
		this.width = width; this.height = height;
		this.type = type; this.format = format; this.internalFormat = internalFormat;
		this.levels = 1;
	}
	
	CreateEmptyRGBAubyte(width, height){ this.CreateEmpty(width, height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE); }
	CreateEmptyRGBubyte(width, height){  this.CreateEmpty(width, height, gl.RGB8,  gl.RGB,  gl.UNSIGNED_BYTE); }
	CreateEmptyRGubyte(width, height){   this.CreateEmpty(width, height, gl.RG8,   gl.RG,   gl.UNSIGNED_BYTE); }
	CreateEmptyRubyte(width, height){    this.CreateEmpty(width, height, gl.R8,    gl.RED,  gl.UNSIGNED_BYTE); }
	
	CreateEmptyRGBAfloat32(width, height){ this.CreateEmpty(width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT); }
	CreateEmptyRGBfloat32(width, height){  this.CreateEmpty(width, height, gl.RGB32F,  gl.RGB,  gl.FLOAT); }
	CreateEmptyRGfloat32(width, height){   this.CreateEmpty(width, height, gl.RG32F,   gl.RG,   gl.FLOAT); }
	CreateEmptyRfloat32(width, height){    this.CreateEmpty(width, height, gl.R32F,    gl.RED,  gl.FLOAT); }
	
	// CreateEmptyDepthfloat(width, height){ this.CreateEmpty(width, height, gl.R32F, gl.DEPTH_COMPONENT, gl.FLOAT); }
	// CreateEmptyDepthuint(width, height){  this.CreateEmpty(width, height, gl.R32UI, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT); }
	
	CreateEmptyDepthfloat(width, height){ this.CreateEmpty(width, height, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT); }
	CreateEmptyDepthuint(width, height){  this.CreateEmpty(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT); }
	CreateEmptyDepthushort(width, height){  this.CreateEmpty(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT); }
	
	CreateEmptyDepthStencil(width, height){ this.CreateEmpty(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8); }
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
	
	CreateEmptyWithMips(width, height, internalFormat, format, type, levels){
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //_MIPMAP_LINEAR LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		gl.texImage2D(this.targetType, 0, internalFormat, width, height, 0, format, type, null);
		// gl.texStorage2D(this.targetType, levels, internalFormat, width, height);
		gl.generateMipmap(gl.TEXTURE_2D);

		gl.bindTexture(this.targetType, null);
		
		this.width = width; this.height = height;
		this.type = type; this.format = format; this.internalFormat = internalFormat;
		this.levels = levels;
	}
	
	CreateEmptyWithMipsRGBAubyte(width, height){ this.CreateEmptyWithMips(width, height, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsRGBubyte(width, height){  this.CreateEmptyWithMips(width, height, gl.RGB8,  gl.RGB,  gl.UNSIGNED_BYTE, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsRGubyte(width, height){   this.CreateEmptyWithMips(width, height, gl.RG8,   gl.RG,   gl.UNSIGNED_BYTE, CalcNofMipLevels(width,height)); }
	CreateEmtpyWithMipsRubyte(width, height){    this.CreateEmptyWithMips(width, height, gl.R8,    gl.RED,  gl.UNSIGNED_BYTE, CalcNofMipLevels(width,height)); }
	
	CreateEmptyWithMipsRGBAfloat32(width, height){ this.CreateEmptyWithMips(width, height, gl.RGBA32F, gl.RGBA, gl.FLOAT, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsRGBfloat32(width, height){  this.CreateEmptyWithMips(width, height, gl.RGB32F,  gl.RGB,  gl.FLOAT, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsRGfloat32(width, height){   this.CreateEmptyWithMips(width, height, gl.RG32F,   gl.RG,   gl.FLOAT, CalcNofMipLevels(width,height)); }
	CreateEmtpyWithMipsRfloat32(width, height){    this.CreateEmptyWithMips(width, height, gl.R32F,    gl.RED,  gl.FLOAT, CalcNofMipLevels(width,height)); }
	
	// CreateEmptyDepthfloat(width, height){ this.CreateEmpty(width, height, gl.R32F, gl.DEPTH_COMPONENT, gl.FLOAT); }
	// CreateEmptyDepthuint(width, height){  this.CreateEmpty(width, height, gl.R32UI, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT); }
	
	CreateEmptyWithMipsDepthfloat(width, height){ this.CreateEmptyWithMips(width, height, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsDepthuint(width, height){  this.CreateEmptyWithMips(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, CalcNofMipLevels(width,height)); }
	CreateEmptyWithMipsDepthushort(width, height){  this.CreateEmptyWithMips(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, CalcNofMipLevels(width,height)); }
	
	CreateEmptyWithMipsDepthStencil(width, height){ this.CreateEmptyWithMips(width, height, gl.DEPTH_COMPONENT24, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, CalcNofMipLevels(width,height)); }
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
	
	Reload(){
		var tx = document.getElementById(this.name);
		gl.bindTexture(this.targetType, this.texture);
		
			gl.texImage2D(this.targetType, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tx);
			gl.generateMipmap(this.targetType);
	
		gl.bindTexture(this.targetType, null);
		
		if( !(typeof tx.width === 'undefined') && !(typeof tx.height === 'undefined')){
			this.width = tx.width; this.height = tx.height;
			this.levels = CalcNofMipLevels(this.width,this.height);
		}		
	}
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
		
	setWrapTypeClampToEdge(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setWrapTypeRepeat(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.REPEAT);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterLinearMipMapLinear(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterLinearLinear(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterNearestNearest(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		gl.bindTexture(this.targetType, null);
	}
	
	CreateFromFile(id){
		this.name = id;
		var image = document.getElementById(id);
		if(image == null){
			alert("CTexture.CreateFromFile(id) image == null, " + id); return; }
		this.Type = image.type;
		this.CreateWithDefaultParams(image);
	}
	
	CreateMipMaps(){
		if(this.texture == -1) return false;
		gl.bindTexture(this.targetType, this.texture);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //_MIPMAP_LINEAR LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		this.levels = CalcNofMipLevels(this.width,this.height);
		var level_dimensions = [this.width, this.height];
		for(var level = 1; level < this.levels; ++level){
			level_dimensions = [ Math.max(Math.floor(level_dimensions[0]/2.0), 1) , Math.max(Math.floor(level_dimensions[1]/2.0), 1) ];
			gl.texImage2D(this.targetType, level, this.internalFormat, level_dimensions[0], level_dimensions[1], 0, this.format, this.type, null);
		}
		// gl.generateMipmap(this.targetType);
		
		gl.bindTexture(this.targetType, null);
		
		return true;
	}
	
	Bind(slot, uniformLocation){
		if(uniformLocation === -1) return false;
		
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(this.targetType, this.texture);
		gl.uniform1i(uniformLocation, slot);
		this.activeSlot = slot;
		
		return true;
	}
	
	Unbind(){
		gl.activeTexture(gl.TEXTURE0 + this.activeSlot);
		gl.bindTexture(this.targetType, null);
	}
	
	static Unbind(slot){
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(gl.TEXTURE_2D, null);
	}
	
	Delete(){
		gl.deleteTexture(this.texture); this.texture = -1;
		this.init();
	}
}

export class CTextureCube{
		
	constructor(slotID){
		this.SlotID = slotID;
		this.Type = "txC";
		this.texture = -1;
		this.activeSlot = -1;
		this.targetType = gl.TEXTURE_CUBE_MAP;
		this.width = 0;
	}
	
	CreateWithDefaultParams(tx){
		
		if(tx.length != 6) return false;
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
		(!gl.isWGL2) && gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		(!gl.isWGL2) && gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		for(var i = 0; i < 6; ++i){
			gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tx[i]);
		}
		
		gl.bindTexture(this.targetType, null);
		return true;
	}
	
	Create(tx, width, format, datatype){
		
		if(tx.length != 6) return false;
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
		(!gl.isWGL2) && gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		(!gl.isWGL2) && gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.isWGL2 && gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		var internal_format = format;
		if(gl.isWGL2 == true && datatype == gl.FLOAT){
			switch(format){
				case gl.RED: internal_format = gl.R32F; break;
				case gl.RG: internal_format = gl.RG32F; break;
				case gl.RGB: internal_format = gl.RGB32F; break;
				case gl.RGBA: internal_format = gl.RGBA32F; break;
			}
		}
		
		if(Array.isArray(tx[0]) == false){
			for(var i = 0; i < 6; ++i){
				gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, internal_format, width, width, 0, format, datatype, tx[i]);
			}
		}
		else{
			for(var i = 0; i < 6; ++i){
				for(var l = 0; l < tx[i].length; ++l){ var dim = width>>l;
					gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, l, internal_format, dim, dim, 0, format, datatype, tx[i][l]);
				}
			}
		}
		
		this.width = width;
		
		gl.bindTexture(this.targetType, null);
		return true;
	}
	
	Bind(slot, uniformLocation){
		if(uniformLocation === -1) return false;
		
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(this.targetType, this.texture);
		gl.uniform1i(uniformLocation, slot);
		this.activeSlot = slot;
		
		return true;
	}
	
	Unbind(){
		gl.activeTexture(gl.TEXTURE0 + this.activeSlot);
		gl.bindTexture(this.targetType, null);
	}
	
	static Unbind(slot){
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(this.targetType, null);
	}
		
	Delete(){
		gl.deleteTexture(this.texture); this.texture = -1;
	}
	
	CreateFromDOMDataElements(id)
	{	
		var elm = document.getElementById(id);
		if(elm == null) return false;
		if(typeof elm.value === 'undefined' || elm.value == null) return false;
		if(elm.type != "multiple_DOM_id") return false;
		
		var storeIDs = elm.value.split(":");
		var storeIDsNo = storeIDs.length;
		if((storeIDsNo % 6) != 0) return false; //mora biti 6 strana
		var mipCount = storeIDsNo / 6;
		
		var tx = [[],[],[],[],[],[]];
		var side = 0; var level = 0;
		var format = gl.RGBA;
		var dataType = gl.UNSIGNED_BYTE;
		var width = 0;
		
		for(var i = 0; i < storeIDs.length; ++i)
		{
			// var obj = document.getElementById(storeIDs[i]);
			var obj = sys.storage.CGlobalStorage.get(storeIDs[i]);
			if(typeof obj === 'undefined' || obj == null){
				obj = sys.storage.CGlobalStorage.get(storeIDs[i]); }
			if(typeof obj.value === 'undefined' || obj.value == null) return false;
			
			var strFileType = "";
			var strType = obj.type.split("/");
			if(strType[0] != "txC") return false;
			
			if(strType.length > 2)
				strFileType = strType[2];
			else{
				var ext = storeIDs[i].split("_");
				strFileType = ext[ext.length-1];
			}
			strFileType = strFileType.toLowerCase();
			
			switch(strFileType){
				case "hdr":
				{
					var hdrImg = new CHDRImage(obj.value);
					hdrImg.DecodeRAWData();
					tx[side][level] = hdrImg.getData();
					
					dataType = gl.FLOAT;
					format = gl.RGB;
					// width = hdrImg.getWidth();
					width = Math.max(width, hdrImg.getWidth());
					break;
				}
				default:
					break;
			}
			
			level++;
			if(level >= mipCount){ side++; level = 0; }
			if(side > 6){
				break;}
		}
		
		this.Create(tx, width, format, dataType);
	}
}

export class CTexture3D{
	
	constructor(slotID){
		this.SlotID = slotID;
		this.Type = "tx3D";
		this.texture = -1;
		this.activeSlot = -1;
		this.targetType = gl.TEXTURE_3D;
		this.width = 0;
		this.height = 0;
		this.depth = 0;
		this.levels = 1;
		this.format = -1;
		this.internalFormat = -1;
		this.type = -1;
		this.name = "-";
		this.scr = "";
	}
	
	CreateEmpty(width, height, depth, internalFormat, format, type){
		
		this.texture = gl.createTexture();
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //_MIPMAP_LINEAR LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		gl.texImage3D(this.targetType, 0, internalFormat, width, height, depth, 0, format, type, null);
	
		gl.bindTexture(this.targetType, null);
		
		this.width = width; this.height = height; this.depth = depth;
		this.type = type; this.format = format; this.internalFormat = internalFormat;
		this.levels = 1;
	}
	
	CreateEmptyRGBAubyte(width, height, depth){ this.CreateEmpty(width, height, depth, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE); }
	CreateEmptyRGBubyte(width, height, depth){  this.CreateEmpty(width, height, depth, gl.RGB8,  gl.RGB,  gl.UNSIGNED_BYTE); }
	CreateEmptyRGubyte(width, height, depth){   this.CreateEmpty(width, height, depth, gl.RG8,   gl.RG,   gl.UNSIGNED_BYTE); }
	CreateEmptyRubyte(width, height, depth){    this.CreateEmpty(width, height, depth, gl.R8,    gl.RED,  gl.UNSIGNED_BYTE); }
	
	CreateEmptyRGBAfloat32(width, height, depth){ this.CreateEmpty(width, height, depth, gl.RGBA32F, gl.RGBA, gl.FLOAT); }
	CreateEmptyRGBfloat32(width, height, depth){  this.CreateEmpty(width, height, depth, gl.RGB32F,  gl.RGB,  gl.FLOAT); }
	CreateEmptyRGfloat32(width, height, depth){   this.CreateEmpty(width, height, depth, gl.RG32F,   gl.RG,   gl.FLOAT); }
	CreateEmptyRfloat32(width, height, depth){    this.CreateEmpty(width, height, depth, gl.R32F,    gl.RED,  gl.FLOAT); }
	
	// CreateEmptyDepthfloat(width, height, depth){ this.CreateEmpty(width, height, depth, gl.R32F, gl.DEPTH_COMPONENT, gl.FLOAT); }
	// CreateEmptyDepthuint(width, height, depth){  this.CreateEmpty(width, height, depth, gl.R32UI, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT); }
	
	CreateEmptyDepthfloat(width, height, depth){ this.CreateEmpty(width, height, depth, gl.DEPTH_COMPONENT32F, gl.DEPTH_COMPONENT, gl.FLOAT); }
	CreateEmptyDepthuint(width, height, depth){  this.CreateEmpty(width, height, depth, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT); }
	CreateEmptyDepthushort(width, height, depth){  this.CreateEmpty(width, height, depth, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT); }
	
	CreateEmptyDepthStencil(width, height, depth){ this.CreateEmpty(width, height, depth, gl.DEPTH_COMPONENT24, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8); }
	
	CreateFromZip(id)
	{
		var obj = sys.storage.CGlobalStorage.get(id);
		if(obj == null) return false;
		if(obj instanceof sys.storage.CStorageElement == false) return false;
		
		var zip = obj.data;
		if(zip instanceof sys.zip.CZip == false) return false;
		
		var info = getTextureTypeFromDOMType(obj.type);
		if(info.type != "tx3D") return false;
		
		var files = zip.contents.files;
		
		this.CreateEmpty();
		
		if(files.length == 1){ //jedan raw image format
			
		}
		else{
			//brojevi slika ce biti od 0000.png ... nnnn.png
			for(var i = 0; i < files.length; ++i){
				//ToDo: dovrsit
			}
		}
	}
	
	//------------------------------------------------------------------------------------------------------------------------------------------------
		
	setWrapTypeClampToEdge(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setWrapTypeRepeat(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(this.targetType, gl.TEXTURE_WRAP_T, gl.REPEAT);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterLinearMipMapLinear(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterLinearLinear(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		gl.bindTexture(this.targetType, null);
	}
	
	setMinMagFilterNearestNearest(){
		gl.bindTexture(this.targetType, this.texture);
		
		gl.texParameteri(this.targetType, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //LINEAR_MIPMAP_LINEAR
		gl.texParameteri(this.targetType, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		
		gl.bindTexture(this.targetType, null);
	}
	
	Bind(slot, uniformLocation){
		if(uniformLocation === -1) return false;
		
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(this.targetType, this.texture);
		gl.uniform1i(uniformLocation, slot);
		this.activeSlot = slot;
		
		return true;
	}
	
	Unbind(){
		gl.activeTexture(gl.TEXTURE0 + this.activeSlot);
		gl.bindTexture(this.targetType, null);
	}
		
	Delete(){
		gl.deleteTexture(this.texture); this.texture = -1;
	}
	
	static Unbind(slot){
		gl.activeTexture(gl.TEXTURE0 + slot);
		gl.bindTexture(this.targetType, null);
	}
	
}

var globalTextureList = null;

export class CTextureList
{
	
	constructor(){
		this.textures = [];
	}
	
	static addTexture(texture){
		texture.SlotID = CTextureList.singleton().textures.length;
		CTextureList.singleton().textures[CTextureList.singleton().textures.length] = texture;
	}
	
	static addTextures(new_textures){
		for(var i = 0; i < new_textures.length; ++i)
			CTextureList.addTexture(new_textures[i]);
	}
	
	static get(SlotID){
		if(SlotID < CTextureList.singleton().textures.length){
			return CTextureList.singleton().textures[SlotID];
		}
		return null;
	}
	
	static Init(){
		if(globalTextureList == null)
			globalTextureList = new CTextureList();
	}
	
	static singleton(){
		CTextureList.Init();
		return globalTextureList;
	}
	
	static CreateTexture(){
		var texture = new CTexture(0);
		CTextureList.addTexture(texture);
		return texture;
	}
	static CreateTextureCube(){
		var texture = new CTextureCube(0);
		CTextureList.addTexture(texture);
		return texture;
	}
	static CreateTexture3D(){
		var texture = new CTexture3D(0);
		CTextureList.addTexture(texture);
		return texture;
	}
	
	static count(){ return CTextureList.singleton().textures.length; }
}

//----------------------------------------------------------------------------


//----------------------------------------------------------------------------
//Cubemap i mipovi spremljeni u global storage listu. 
//CTextureCube klasa koristi CreateFromDOMDataElements() za ucitavanje iz globalne liste
//----------------------------------------------------------------------------

function StoreAsDOMElement(storeID, type, data){
	var elm = document.getElementById(storeID);
	if(elm == null){
		elm = document.createElement("DATA");
	}
	elm.id = storeID;
	elm.value = data;
	elm.type = type;
	// elm.style = "display: none;";
	document.body.insertBefore(elm, null);
}

function StoreInGlobalStorage(storeID, type, data){
	sys.storage.CGlobalStorage.add(storeID, new sys.storage.CStorageElement(storeID, type, data));
	// console.log("StoreInGlobalStorage(): " + storeID);
}

function fetchAndStore(path, storeID, type, onLoadFinish){
	fetch(path).then(
		function(response){
			response.blob().then(
				function(blob){
					var arrayBuffer = null;
					var fileReader = new FileReader();
					fileReader.onload = function(event){
						arrayBuffer = event.target.result;
						var ui8Array = new Uint8Array(arrayBuffer);
						// StoreAsDOMElement(storeID, type, ui8Array);
						StoreInGlobalStorage(storeID, type, ui8Array);
						if(onLoadFinish != null) onLoadFinish();
					};
					fileReader.readAsArrayBuffer(blob);
				}
			);
		}
	);
}
	
function fetchCubemap(obj, path, mipCount, fileType, onLoadFinish){
	var strPaths = [];
	var strStoreIDs = [];
	
	var id = obj.id;
	var type = obj.type;
	
	//provjerit jeli dobro pravi putanje:
	for(var side = 0; side < 6; ++side){
		
		if(mipCount != -1){
			for(var mipLevel = 0; mipLevel < mipCount; ++mipLevel){
				var strExt = "_m" + ((mipLevel < 10)? "0" : "") + String(mipLevel) + "_c0" + String(side);
				strPaths[strPaths.length] = path + strExt + "." + fileType;
				strStoreIDs[strStoreIDs.length] = id + strExt + "_" + fileType;
			}
		}
		else{
			var strExt = "_c0" + String(side);
			strPaths[strPaths.length] = path + strExt + "." + fileType;
			strStoreIDs[strStoreIDs.length] = id + strExt + "_" + fileType;
		}
	}
	
	//provjerit jeli dobro dohvaca fileove:
	for(var i = 0; i < strPaths.length-1; ++i)
		fetchAndStore(strPaths[i], strStoreIDs[i], type, null);
	fetchAndStore(strPaths[strPaths.length-1], strStoreIDs[strStoreIDs.length-1], type, onLoadFinish);
	
	var src = "";
	for(var i = 0; i < strStoreIDs.length; ++i)
		src = src + strStoreIDs[i] + ((i != strStoreIDs.length-1)? ":" : "");
	obj.value = src;
	obj.type = "multiple_DOM_id";
}

// txC/Amb:128/hdr
//ToDo: ucitavanje cubemape iz zip filea

function fetchImage_txC(obj, onLoadFinish){
	var strType = obj.type.split("/");
	if(strType[0] != "txC") return false;
	
	var strFilePathArray = splitFilePathExt(obj.src);
	
	var strUsage = [""]; var strFileType = ""; var strFilePath = "";
	var mipCount = -1;
	
	if(strType.length > 1)
		strUsage = strType[1].split(":");
	if(strType.length > 2)
		strFileType = strType[2];
	else if(strFilePathArray.length > 1)
		strFileType = strFilePathArray[1];
	if(strFilePathArray.length > 0)
		strFilePath = strFilePathArray[0];
	
	if(strUsage.length > 1){
		var dim = parseInt(strUsage[1]);
		mipCount = Math.floor(Math.log(dim) / Math.log(2.0)) + 1;}
		
	fetchCubemap(obj, strFilePath, mipCount, strFileType, onLoadFinish);
}

//----------------------------------------------------------------------------

//----------------------------------------------------------------------------
// CTexture3D 
//----------------------------------------------------------------------------



//----------------------------------------------------------------------------

	
export function fetchImage(obj, onLoadFinish){
	var strType = obj.type.split("/");
	if(strType.length == 0) return false;
	
	switch(strType[0]){
		case "tx1D": break;
		case "tx2D": break;
		case "tx3D": break;
		case "txC": fetchImage_txC(obj, onLoadFinish); break;
	}
}

export function FormatFromInternalFormat(internalFormat)
{
	switch(internalFormat)
	{
		case gl.R8				: return gl.RED;
		case gl.R8_SNORM		: return gl.RED;
		case gl.R16				: return gl.RED;
		case gl.R16_SNORM		: return gl.RED;
		case gl.RG8				: return gl.RG;
		case gl.RG8_SNORM		: return gl.RG;
		case gl.RG16			: return gl.RG;
		case gl.RG16_SNORM		: return gl.RG;
		case gl.R3_G3_B2		: return gl.RGB;
		case gl.RGB4			: return gl.RGB;
		case gl.RGB5			: return gl.RGB;
		case gl.RGB8			: return gl.RGB;
		case gl.RGB8_SNORM		: return gl.RGB;
		case gl.RGB10			: return gl.RGB;
		case gl.RGB12			: return gl.RGB;
		case gl.RGB16_SNORM		: return gl.RGB;
		case gl.RGBA2			: return gl.RGBA;
		case gl.RGBA4			: return gl.RGBA;
		case gl.RGB5_A1			: return gl.RGBA;
		case gl.RGBA8			: return gl.RGBA;
		case gl.RGBA8_SNORM		: return gl.RGBA;
		case gl.RGB10_A2		: return gl.RGBA;
		case gl.RGB10_A2UI		: return gl.RGBA;
		case gl.RGBA12			: return gl.RGBA;
		case gl.RGBA16			: return gl.RGBA;
		case gl.SRGB8			: return gl.RGB;
		case gl.SRGB8_ALPHA8	: return gl.RGBA;
		case gl.R16F			: return gl.RED;
		case gl.RG16F			: return gl.RG;
		case gl.RGB16F			: return gl.RGB;
		case gl.RGBA16F			: return gl.RGBA;
		case gl.R32F			: return gl.RED;
		case gl.RG32F			: return gl.RG;
		case gl.RGB32F			: return gl.RGB;
		case gl.RGBA32F			: return gl.RGBA;
		case gl.R11F_G11F_B10F	: return gl.RGB;
		case gl.RGB9_E5			: return gl.RGB;
		case gl.R8I				: return gl.RED;
		case gl.R8UI			: return gl.RED;
		case gl.R16I			: return gl.RED;
		case gl.R16UI			: return gl.RED;
		case gl.R32I			: return gl.RED;
		case gl.R32UI			: return gl.RED;
		case gl.RG8I			: return gl.RG;
		case gl.RG8UI			: return gl.RG;
		case gl.RG16I			: return gl.RG;
		case gl.RG16UI			: return gl.RG;
		case gl.RG32I			: return gl.RG;
		case gl.RG32UI			: return gl.RG;
		case gl.RGB8I			: return gl.RGB;
		case gl.RGB8UI			: return gl.RGB;
		case gl.RGB16I			: return gl.RGB;
		case gl.RGB16UI			: return gl.RGB;
		case gl.RGB32I			: return gl.RGB;
		case gl.RGB32UI			: return gl.RGB;
		case gl.RGBA8I			: return gl.RGBA;
		case gl.RGBA8UI			: return gl.RGBA;
		case gl.RGBA16I			: return gl.RGBA;
		case gl.RGBA16UI		: return gl.RGBA;
		case gl.RGBA32I			: return gl.RGBA;
		case gl.RGBA32UI		: return gl.RGBA;
		default: alert("FormatFromInternalFormat() unknown: " + internalFormat); break;
	}
	return -1;
}

export function TypeFromInternalFormat(internalFormat)
{
	switch(internalFormat)
	{
		case gl.R8				: return gl.UNSIGNED_BYTE;
		case gl.R8_SNORM		: return gl.BYTE;
		case gl.R16				: return gl.UNSIGNED_SHORT;
		case gl.R16_SNORM		: return gl.SHORT;
		case gl.RG8				: return gl.UNSIGNED_BYTE;
		case gl.RG8_SNORM		: return gl.BYTE;
		case gl.RG16			: return gl.UNSIGNED_SHORT;
		case gl.RG16_SNORM		: return gl.SHORT;
		case gl.R3_G3_B2		: return gl.UNSIGNED_BYTE;
		// case gl.RGB4			: return gl.RGB;
		// case gl.RGB5			: return gl.RGB;
		case gl.RGB8			: return gl.UNSIGNED_BYTE;
		case gl.RGB8_SNORM		: return gl.BYTE;
		// case gl.RGB10			: return gl.RGB;
		// case gl.RGB12			: return gl.RGB;
		case gl.RGB16_SNORM		: return gl.UNSIGNED_SHORT;
		case gl.RGBA2			: return gl.UNSIGNED_BYTE;
		// case gl.RGBA4			: return gl.RGBA;
		case gl.RGB5_A1			: return gl.UNSIGNED_SHORT;
		case gl.RGBA8			: return gl.UNSIGNED_BYTE;
		case gl.RGBA8_SNORM		: return gl.BYTE;
		// case gl.RGB10_A2		: return gl.RGBA;
		// case gl.RGB10_A2UI		: return gl.RGBA;
		// case gl.RGBA12			: return gl.RGBA;
		case gl.RGBA16			: return gl.UNSIGNED_SHORT;
		case gl.SRGB8			: return gl.UNSIGNED_BYTE;
		case gl.SRGB8_ALPHA8	: return gl.UNSIGNED_BYTE;
		case gl.R16F			: return gl.FLOAT;
		case gl.RG16F			: return gl.FLOAT;
		case gl.RGB16F			: return gl.FLOAT;
		case gl.RGBA16F			: return gl.FLOAT;
		case gl.R32F			: return gl.FLOAT;
		case gl.RG32F			: return gl.FLOAT;
		case gl.RGB32F			: return gl.FLOAT;
		case gl.RGBA32F			: return gl.FLOAT;
		case gl.R11F_G11F_B10F	: return gl.UNSIGNED_INT;
		case gl.RGB9_E5			: return gl.UNSIGNED_INT;
		case gl.R8I				: return gl.BYTE;
		case gl.R8UI			: return gl.UNSIGNED_BYTE;
		case gl.R16I			: return gl.SHORT;
		case gl.R16UI			: return gl.UNSIGNED_SHORT;
		case gl.R32I			: return gl.INT;
		case gl.R32UI			: return gl.UNSIGNED_INT;
		case gl.RG8I			: return gl.BYTE;
		case gl.RG8UI			: return gl.UNSIGNED_BYTE;
		case gl.RG16I			: return gl.SHORT;
		case gl.RG16UI			: return gl.UNSIGNED_SHORT;
		case gl.RG32I			: return gl.INT;
		case gl.RG32UI			: return gl.UNSIGNED_INT;
		case gl.RGB8I			: return gl.BYTE;
		case gl.RGB8UI			: return gl.UNSIGNED_BYTE;
		case gl.RGB16I			: return gl.SHORT;
		case gl.RGB16UI			: return gl.UNSIGNED_SHORT;
		case gl.RGB32I			: return gl.INT;
		case gl.RGB32UI			: return gl.UNSIGNED_INT;
		case gl.RGBA8I			: return gl.BYTE;
		case gl.RGBA8UI			: return gl.UNSIGNED_BYTE;
		case gl.RGBA16I			: return gl.SHORT;
		case gl.RGBA16UI		: return gl.UNSIGNED_SHORT;
		case gl.RGBA32I			: return gl.INT;
		case gl.RGBA32UI		: return gl.UNSIGNED_INT;
		default: alert("TypeFromInternalFormat() unknown: " + internalFormat); break;
	}
	return -1;
}