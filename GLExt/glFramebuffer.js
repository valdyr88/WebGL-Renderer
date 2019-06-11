import { gl } from "./glContext.js";
import { CModel, GenCubeModel, GenQuadModel } from "./glModel.js";
import { CTexture, CTextureCube, CTextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat } from "./glTexture.js"
import { CShader, CShaderList } from "./glShader.js";
// import * as global from "./globalStorage.js"
import * as sys from "./../System/sys.js"

export class CFramebuffer{
	
	constructor(bindPrevFB){
		this.framebuffer = -1;
		this.attachedTextures = [];
		this.attachedDepth = -1;
		this.width = -1;
		this.height = -1;
		this.bRestorePrevFB = bindPrevFB;
		this.bAutoSetupUsage = true;
	}
	
	Create(){
		this.framebuffer = gl.createFramebuffer();
	}
	
	Bind(){
		CFramebuffer.Bind(this.framebuffer);
	}
	
	AttachTextureLevel(texture, slot, level){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, gl.TEXTURE_2D, texture.texture, level);
		this.attachedTextures[slot] = texture.SlotID;
		this.width = texture.width; this.height = texture.height;
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachTexture(texture, slot){
		this.AttachTextureLevel(texture, slot, 0);
	}
	
	AttachMultipleLevel(textures, level){
		if(textures == null || textures.length == 0) return;
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		for(let slot = 0; slot < textures.length; ++slot){
			let texture = textures[slot];
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, gl.TEXTURE_2D, texture.texture, level);
			this.attachedTextures[slot] = texture.SlotID;
		}
		this.width = textures[0].width; this.height = textures[0].height;
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachMultiple(textures){
		this.AttachMultipleLevel(textures, 0);
	}
	
	AttachTextureLayerLevel(texture, slot, nlayer, level){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, texture.texture, level, nlayer);
		this.attachedTextures[slot] = texture.SlotID;
		this.width = texture.width; this.height = texture.height;
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachTextureLayer(texture, slot, nlayer){
		this.AttachTextureLayerLevel(texture, slot, nlayer, 0);
	}
	
	AttachMultipleLayerLevel(textures, nlayer, level){
		if(textures == null || textures.length == 0) return;
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		for(let slot = 0; slot < textures.length; ++slot){
			let texture = textures[slot];
			gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, texture.texture, level, nlayer);
			this.attachedTextures[slot] = texture.SlotID;
		}
		this.width = textures[0].width; this.height = textures[0].height;
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachMultipleLayer(textures, nlayer){
		this.AttachMultipleLayerLevel(textures, nlayer, 0);
	}
	
	AttachTextureMultipleLayersLevel(texture, slots, nlayers, level){
		if(nlayers == null || nlayers.length == 0) return;
		if(slots == null) return;
		if(nlayers.length != slots.length) return;
		
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		for(let s = 0; s < slots.length; ++s){
			let slot = slots[s]; let nlayer = nlayers[s];
			gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, texture.texture, level, nlayer);
			this.attachedTextures[slot] = texture.SlotID;
		}
		this.width = texture.width; this.height = texture.height;
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachTextureMultipleLayers(texture, slots, nlayers){
		this.AttachTextureMultipleLayersLevel(texture, slots, nlayers, 0);
	}
	
	DetachTextureLevel(slot, level){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, gl.TEXTURE_2D, null, level);
		this.attachedTextures[slot] = -1;
		
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	DetachTexture(slot){
		this.DetachTextureLevel(slot, 0);
	}
	
	DetachAllTextures(lvl){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		if(lvl != undefined || lvl != null) level = lvl;
		var level = 0; 
			
		for(let slot = 0; slot < this.attachedTextures.length; ++slot){
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0+slot, gl.TEXTURE_2D, null, level);
			// this.attachedTextures[slot] = -1;
		}
		this.attachedTextures = [];
		if(this.bAutoSetupUsage == true) this.SetupUsage();
		this.width = -1; this.height = -1;
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	AttachDepth(texture){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture.texture, 0); //gl.DEPTH_STENCIL_ATTACHMENT
		this.attachedDepth = texture.SlotID;
				
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	DetachDepth(){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, null, 0); //gl.DEPTH_STENCIL_ATTACHMENT
		this.attachedDepth = -1;
		
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
	}
	
	SetupUsage(){
		var buffers = [];
		for(let i = 0; i < this.attachedTextures.length; ++i)
			buffers[buffers.length] = gl.COLOR_ATTACHMENT0+i;
		gl.drawBuffers(buffers);
	}
	
	CheckStatus(){
		var oldFBO = gl.currentFramebuffer;
		CFramebuffer.Bind(this.framebuffer);
		var rtn = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if(this.bRestorePrevFB === true) CFramebuffer.Bind(oldFBO);
		
		switch(rtn){
			case gl.FRAMEBUFFER_COMPLETE: return true; break;
			case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT: alert("FRAMEBUFFER_INCOMPLETE_ATTACHMENT"); break;
			case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: alert("FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT"); break;
			case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS: alert("FRAMEBUFFER_INCOMPLETE_DIMENSIONS"); break;
			case gl.FRAMEBUFFER_UNSUPPORTED: alert("FRAMEBUFFER_UNSUPPORTED"); break;
			case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: alert("FRAMEBUFFER_INCOMPLETE_MULTISAMPLE"); break;
			default: break;
		}
		
		return false;
	}
	
	static CopyTextureFromFBColorAttachment(src, src_level, dst, dest_level, fb, bUnbind)
	{
		CFramebuffer.Bind(fb.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, src.texture, 0);//src_level
		gl.bindTexture(gl.TEXTURE_2D, dst.texture);
		gl.copyTexSubImage2D(gl.TEXTURE_2D, dest_level, 0, 0, 0, 0, src.width, src.height);
		if(bUnbind == true){
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);//src_level
		}
	}
	
	static BindMainFB(){ gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.currentFramebuffer = -1; }
	
	static Bind(framebuffer){
		if(framebuffer === gl.currentFramebuffer) return;
		
		if(framebuffer === -1) gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		else gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		
		gl.currentFramebuffer = framebuffer;
	}
	
	ActivateDrawBuffers(shader){
		var fragDataLocations = shader.getFragDataLocations();
		
		var buffers = [];
		for(let i = 0; i < fragDataLocations.length; ++i)
			buffers[buffers.length] = gl.COLOR_ATTACHMENT0+fragDataLocations[i].location;
		gl.drawBuffers(buffers);
	}
}

export class CMipMapGen{
	
	constructor(){
		this.framebuffer = null;
		this.quad_model = null;
		this.shader = null;
		this.textureLevels = [];
		this.width = 0;
		this.height = 0;
		this.internalFormat = -1;
	}
	
	/*
	        // custom-generate successive mipmap levels
            glBindTexture(GL_TEXTURE_2D, color_tex);
            foreach (level > 0, in order of increasing values of level) {
                glFramebufferTexture2DEXT(GL_FRAMEBUFFER_EXT,
                                          GL_COLOR_ATTACHMENT0_EXT,
                                          GL_TEXTURE_2D, color_tex, level);
                glTexParameteri(TEXTURE_2D, TEXTURE_BASE_LEVEL, level-1);
                glTexParameteri(TEXTURE_2D, TEXTURE_MAX_LEVEL, level-1);
 
                <draw to level>
            }
            glTexParameteri(TEXTURE_2D, TEXTURE_BASE_LEVEL, 0);
            glTexParameteri(TEXTURE_2D, TEXTURE_MAX_LEVEL, max);
	*/
	
	Create(width, height, internalFormat, vertex_file, fragment_file)
	{
		this.framebuffer = new CFramebuffer(false);
		this.framebuffer.Create();
		this.quad_model = new CModel(-1);
		GenQuadModel(this.quad_model);
		this.shader = new CShader(-1);
		this.CreateShader(vertex_file, fragment_file);
		this.CreateTextureMipLevels(internalFormat, width, height);
	}
	
	CreateShader(vertex_file, fragment_file)
	{
		if(this.shader.CompileFromFile(vertex_file, fragment_file) == false){ alert("nije kompajliran shader!"); return false; }
		
		this.shader.ULInputTex = this.shader.getUniformLocation("InputTexture");
		this.shader.ULInputTexDim = this.shader.getUniformLocation("InputTextureDimension");
		this.shader.ULInvInputTexDim = this.shader.getUniformLocation("InvInputTextureDimension");
		this.shader.ULCurrentLevel = this.shader.getUniformLocation("CurrentLevel");
		
		this.shader.InitDefaultUniformLocations();
		this.shader.InitDefaultAttribLocations();
		
		return true;
	}
	
	CreateTextureMipLevels(internalFormat, width, height)
	{
		this.width = width; this.height = height;
		var NofLevels = CalcNofMipLevels(width, height);
		var format = FormatFromInternalFormat(internalFormat);
		var type = TypeFromInternalFormat(internalFormat);
		this.internalFormat = internalFormat;
		
		var level_dimensions = [width, height];
			level_dimensions = [ Math.max(Math.floor(level_dimensions[0]/2.0), 1) , Math.max(Math.floor(level_dimensions[1]/2.0), 1) ];
		
		this.textureLevels[0] = null;
		
		for(var level = 1; level < NofLevels; ++level)
		{
			var tx = new CTexture(-1);
			
			/*
				this.SlotID = slotID;
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
			*/
			
			tx.SlotID = -1;
			tx.Type = "tx2D";
			tx.targetType = gl.TEXTURE_2D;
			tx.texture = gl.createTexture();
			
			gl.bindTexture(tx.targetType, tx.texture);
			gl.texParameteri(tx.targetType, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(tx.targetType, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			
			gl.texImage2D(tx.targetType, 0, internalFormat, level_dimensions[0], level_dimensions[1], 0, format, type, null);
		
			gl.bindTexture(tx.targetType, null);
			
			tx.width = level_dimensions[0]; tx.height = level_dimensions[1];
			tx.type = type; tx.format = format; tx.internalFormat = internalFormat;
			tx.levels = 1;
			
			this.textureLevels[level] = tx;
			level_dimensions = [ Math.max(Math.floor(level_dimensions[0]/2.0), 1) , Math.max(Math.floor(level_dimensions[1]/2.0), 1) ];
		}
	}
	
	Generate(texture)
	{
		if(this.framebuffer == null) return false;
		if(this.quad_model == null) return false;
		if(this.shader == null) return false;
		if(texture.height !== this.height || texture.width !== this.width) return false;
		if(this.internalFormat !== texture.internalFormat) return false;
		
		this.framebuffer.bRestorePrevFB = false;
		var NofLevels = this.textureLevels.length;
		
		var ViewDims = gl.getParameter(gl.VIEWPORT);
		
		// gl.viewport(0, 0, this.width, this.height);
		// CFramebuffer.CopyTextureFromFBColorAttachment(texture, 0, this.textureLevels[0], 0, this.framebuffer, false);
		// gl.bindTexture(gl.TEXTURE_2D, null);
		
		CFramebuffer.Bind(this.framebuffer.framebuffer);
		this.shader.Bind();
		texture.Bind(0, this.shader.ULInputTex);
		
		for(var level = 1; level < NofLevels; ++level)
		{
			var tx = this.textureLevels[level];
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx.texture, 0);
			
			this.framebuffer.CheckStatus();
			
			gl.viewport(0, 0, tx.width, tx.height);	
			
				//draw to level, quad
				this.shader.setFloat2Uniform(this.shader.ULInputTexDim, [tx.width, tx.height]);
				this.shader.setFloat2Uniform(this.shader.ULInvInputTexDim, [1.0/tx.width, 1.0/tx.height]);
				this.shader.setIntUniform(this.shader.ULCurrentLevel, level);
				
				this.quad_model.RenderIndexedTriangles(this.shader);
				
			tx.Bind(0, this.shader.ULInputTex); //za sljedeci pass
		}
		
		for(var level = 1; level < NofLevels; ++level)
		{
			var tx = this.textureLevels[level];
			gl.viewport(0, 0, tx.width, tx.height);	
			CFramebuffer.CopyTextureFromFBColorAttachment(tx, 0, texture, level, this.framebuffer, false);
		}
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.viewport(ViewDims[0],ViewDims[1],ViewDims[2],ViewDims[3]);	
	}
	
/* 	Generate(texture)
	{
		if(this.framebuffer == null) return false;
		if(this.quad_model == null) return false;
		if(this.shader == null) return false;
		this.framebuffer.bRestorePrevFB = false;
		
		if(texture.levels <= 1)
			texture.CreateMipMaps();
		
		// var NofLevels = CalcNofMipLevels(texture.width, texture.height);
		var NofLevels = texture.levels;
		if(texture.levels <= 1) return false;
		
		gl.disable(gl.DEPTH_TEST);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
			
		CFramebuffer.Bind(this.framebuffer.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, null, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
		this.framebuffer.CheckStatus();
		
		this.shader.Bind();
		
		texture.Bind(0, this.shader.ULInputTex);
		// var txslot = 0;
		// txslot = gl.getParameter(gl.ACTIVE_TEXTURE) - gl.TEXTURE0;
		// gl.activeTexture(gl.TEXTURE0 + txslot);
		// gl.bindTexture(gl.TEXTURE_2D, texture.texture);
		// gl.uniform1i(this.shader.ULInputTex, txslot);
		
		var level_dimensions = [texture.width, texture.height];
		
		for(var level = 1; level < NofLevels; ++level)
		{
			gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture.texture, level, 0);
			// gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, level);//<-- level mora biti 0 po WebGL 2.0 specifikaciji (iako za ES 3.0 moze bit >= 0)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, level-1);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL,  level-1);
			
			// this.framebuffer.CheckStatus();
			
			level_dimensions = [ Math.max(Math.floor(level_dimensions[0]/2.0), 1) , Math.max(Math.floor(level_dimensions[1]/2.0), 1) ];
			
			gl.viewport(0, 0, level_dimensions[0], level_dimensions[1]);	
			
				//draw to level, quad
				this.shader.setFloat2Uniform(this.shader.ULInputTexDim, [level_dimensions[0], level_dimensions[1]]);
				this.shader.setFloat2Uniform(this.shader.ULInvInputTexDim, [1.0/level_dimensions[0], 1.0/level_dimensions[1]]);
				this.shader.setIntUniform(this.shader.ULCurrentLevel, level);
					
				this.quad_model.RenderIndexedTriangles(this.shader);
		}
		
		for(var level = 1; level < NofLevels; ++level)
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, level);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_BASE_LEVEL, 0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, NofLevels);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		gl.enable(gl.DEPTH_TEST);
		
		return true;
	} */
}