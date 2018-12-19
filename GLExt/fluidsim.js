import { gl, WriteDebug } from "./glContext.js";
import { Shader, ShaderList } from "./glShader.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { Texture, Texture3D, TextureList } from "./glTexture.js";
import { Model, GenQuadModel } from "./glModel.js"
import { Framebuffer } from "./glFramebuffer.js";

export class FluidSim2D
{
	constructor(w, h, vertex, viscosity, advection, advection_correction,
				divergence, pressure, divfree_velocity, display)
	{
		this.quad_model = new Model(-1);
		GenQuadModel(this.quad_model);
		
		this.width = Math.floor(w);
		this.height = Math.floor(h);
		this.aspect = [1.0 / this.width, 1.0 / this.height];
		this.str_vec2Res = "vec2(" + this.width.toString()+ ".0," + this.height.toString() + ".0)";
		
		this.viscosity_shader = new Shader(-1);
		this.viscosity_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.viscosity_shader.CompileFromFile(vertex, viscosity) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = -1;
		this.viscosity_shader.ULdT = -1;
		this.viscosity_shader.ULk = -1;
		this.viscosity_shader.ULTextureVelocity = -1;
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
				
		this.advection_shader = new Shader(-1);
		this.advection_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.advection_shader.CompileFromFile(vertex, advection) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = -1;
		this.advection_shader.ULdT = -1;
		this.advection_shader.ULTextureVelocity = -1;
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
				
		this.advection_correction_shader = new Shader(-1);
		this.advection_correction_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.advection_correction_shader.CompileFromFile(vertex, advection_correction) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = -1;
		this.advection_correction_shader.ULdT = -1;
		this.advection_correction_shader.ULTextureVelocity = -1;
		this.advection_correction_shader.ULTextureAdvectedVelocity = -1;
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
				
		this.divergence_shader = new Shader(-1);
		this.divergence_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.divergence_shader.CompileFromFile(vertex, divergence) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = -1;
		this.divergence_shader.ULdT = -1;
		this.divergence_shader.ULTexture = -1;
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
				
		this.pressure_shader = new Shader(-1);
		this.pressure_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.pressure_shader.CompileFromFile(vertex, pressure) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = -1;
		this.pressure_shader.ULdT = -1;
		this.pressure_shader.ULTexturePressure = -1;
		this.pressure_shader.ULTextureDivergence = -1;
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
				
		this.divfree_velocity_shader = new Shader(-1);
		this.divfree_velocity_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.divfree_velocity_shader.CompileFromFile(vertex, divfree_velocity) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = -1;
		this.divfree_velocity_shader.ULdT = -1;
		this.divfree_velocity_shader.ULTexturePressure = -1;
		this.divfree_velocity_shader.ULTextureVelocity = -1;
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
				
		this.display_shader = new Shader(-1);
		this.display_shader.addDefine("_DEBUG_Display_Velocity","");
		this.display_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.display_shader.CompileFromFile(vertex, display) == false) alert("nije kompajliran shader!");
		this.display_shader.InitDefaultAttribLocations();
		this.display_shader.InitDefaultUniformLocations();
		this.display_shader.ULaspect = -1;
		this.display_shader.ULdT = -1;
		this.display_shader.ULk = -1;
		this.display_shader.ULdisplayBrightness = -1;
		this.display_shader.ULTexturePressure = -1;
		this.display_shader.ULTextureVelocity = -1;
		this.display_shader.ULTextureDivergence = -1;
		this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
		this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
		this.display_shader.ULk = this.display_shader.getUniformLocation("k");
		this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
		this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
		this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
		this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");
				
		ShaderList.addShader(this.viscosity_shader);
		ShaderList.addShader(this.advection_shader);
		ShaderList.addShader(this.advection_correction_shader);
		ShaderList.addShader(this.divergence_shader);
		ShaderList.addShader(this.pressure_shader);
		ShaderList.addShader(this.divfree_velocity_shader);
		ShaderList.addShader(this.display_shader);
		
		/*
			texture:
				Velocity_0,Velocity_1,Velocity_2 : xyz float
				Divergence : x float
				Pressure_0,Pressure_1 : x float
		*/
		
		this.txVelocity0 = new Texture(-1); this.txVelocity0.CreateEmptyRGBAfloat32(this.width, this.height);
		this.txVelocity1 = new Texture(-1); this.txVelocity1.CreateEmptyRGBAfloat32(this.width, this.height);
		this.txVelocity2 = new Texture(-1); this.txVelocity2.CreateEmptyRGBAfloat32(this.width, this.height);
		
		//ovo swappa 
		this.txDiffusedVelocity = this.txVelocity0;
		this.txAdvectedVelocity = this.txVelocity1;
		this.txVelocity = this.txVelocity2;
		this.txOldVelocity = this.txVelocity0;
		
		//ovo mozda optimizirat i strpat ove tri teksture kao komponente txAdvectedVelocity (ili one koja se ne koristi)?
		this.txDivergence = new Texture(-1); this.txDivergence.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure0 = new Texture(-1); this.txPressure0.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure1 = new Texture(-1); this.txPressure1.CreateEmptyRfloat32(this.width, this.height);
		
		this.txPressure = this.txPressure0;
		this.txOldPressure = this.txPressure1;
		
		// this.txDepth = new Texture(-1); this.txDepth.CreateEmptyDepthfloat(this.width, this.height);
		
		TextureList.addTexture(this.txVelocity0);
		TextureList.addTexture(this.txVelocity1);
		TextureList.addTexture(this.txVelocity2);
		TextureList.addTexture(this.txDivergence);
		TextureList.addTexture(this.txPressure0);
		TextureList.addTexture(this.txPressure1);
		// TextureList.addTexture(this.txDepth);
		
		this.txVelocity0.setMinMagFilterLinearLinear();
		this.txVelocity1.setMinMagFilterLinearLinear();
		this.txVelocity2.setMinMagFilterLinearLinear();
		this.txDivergence.setMinMagFilterLinearLinear();
		this.txPressure0.setMinMagFilterLinearLinear();
		this.txPressure1.setMinMagFilterLinearLinear();
		
		this.txVelocity0.setWrapTypeClampToEdge();
		this.txVelocity1.setWrapTypeClampToEdge();
		this.txVelocity2.setWrapTypeClampToEdge();
		this.txDivergence.setWrapTypeClampToEdge();
		this.txPressure0.setWrapTypeClampToEdge();
		this.txPressure1.setWrapTypeClampToEdge();
		
		//framebuffer
		this.framebuffer = new Framebuffer(false); this.framebuffer.Create();
		// this.framebuffer.AttachDepth(this.txDepth);
		
		this.kinematicViscosity = 1.0;
		
		this.strDisplayType = "";
		this.dt = 0.01;
		this.time = 0.0;
		this.displayBrightness = 1.0;
		
		this.NofPressureIterations = 1;
	}
	
	ClearBuffers()
	{
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		// this.framebuffer.AttachDepth(this.txDepth);
		// this.framebuffer.CheckStatus();
		
		gl.viewport(0, 0, this.width, this.height);
		
		gl.disable(gl.DEPTH_TEST);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		// gl.clearDepth(1.0);
		
		this.framebuffer.AttachTexture(this.txVelocity0, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.framebuffer.AttachTexture(this.txVelocity1, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.framebuffer.AttachTexture(this.txVelocity2, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.framebuffer.AttachTexture(this.txDivergence, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.framebuffer.AttachTexture(this.txPressure0, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.framebuffer.AttachTexture(this.txPressure1, 0);
		this.framebuffer.CheckStatus();
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		Framebuffer.Bind(oldFB);
	}
	
	SimStep(dT){
		/* 
			swap textura: velocity i pressure
			viscosity pass: input je txOldVelocity, output je txDiffusedVelocity
			force add pass -> zasad ne
			advection pass: input je txDiffusedVelocity, output je txAdvectedVelocity
			advection correction pass: input je txAdvectedVelocity, output je txAdvectedCorrectedVelocity
			divergence pass na velocity: input je txAdvectedCorrectedVelocity, output je txDivergence
			pressure calc pass: input je txDivergence i txOldPressure, output je txPressure
			divergence free velocity pass: input je txPressure i txAdvectedCorrectedVelocity, output je txVelocity
			display u mainu
		*/
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		gl.viewport(0, 0, this.width, this.height);
		this.dt = dT;
		gl.disable(gl.BLEND);
		
		//0. swap textura: velocity i pressure
		{
			var temp = this.txVelocity0;
			this.txVelocity0 = this.txVelocity2;
			this.txVelocity2 = temp;
			
			this.txOldVelocity = this.txVelocity0;
			
			temp = this.txPressure0;
			this.txPressure0 = this.txPressure1;
			this.txPressure1 = temp;
			
			this.txOldPressure = this.txPressure0;
		}
		
		//1. viscosity pass: input je txOldVelocity, output je txDiffusedVelocity
		{
			this.txDiffusedVelocity = this.txVelocity1;
			this.framebuffer.AttachTexture(this.txDiffusedVelocity, 0);
			
			this.viscosity_shader.Bind();
				this.txOldVelocity.Bind(0, this.viscosity_shader.ULTextureVelocity);
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULdT, dT);
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULk, this.kinematicViscosity);
				this.viscosity_shader.setFloat2Uniform( this.viscosity_shader.ULaspect, this.aspect );
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULTime, this.time);
				
				this.quad_model.RenderIndexedTriangles(this.viscosity_shader);	
		}
		
		//2. advection pass: input je txDiffusedVelocity, output je txAdvectedVelocity
		{
			this.txAdvectedVelocity = this.txVelocity2;
			this.framebuffer.AttachTexture(this.txAdvectedVelocity, 0);
			
			this.advection_shader.Bind();
				this.txDiffusedVelocity.Bind(0, this.advection_shader.ULTextureVelocity);
				this.advection_shader.setFloatUniform( this.advection_shader.ULdT, dT);
				this.advection_shader.setFloat2Uniform( this.advection_shader.ULaspect, this.aspect);
				
				this.quad_model.RenderIndexedTriangles(this.advection_shader);
		}
		
		//3. advection correction pass: input je txAdvectedVelocity i txDiffusedVelocity, output je txAdvectedCorrectedVelocity
		{
			this.txAdvectedCorrectedVelocity = this.txVelocity0;
			this.framebuffer.AttachTexture(this.txAdvectedCorrectedVelocity, 0);
			
			this.advection_correction_shader.Bind();
				this.txAdvectedVelocity.Bind(0, this.advection_correction_shader.ULTextureAdvectedVelocity);
				this.txDiffusedVelocity.Bind(1, this.advection_correction_shader.ULTextureVelocity);
				this.advection_correction_shader.setFloatUniform( this.advection_correction_shader.ULdT, dT);
				this.advection_correction_shader.setFloat2Uniform( this.advection_correction_shader.ULaspect, this.aspect);
				
				this.quad_model.RenderIndexedTriangles(this.advection_correction_shader);
		}
		
		//4. divergence pass na velocity: input je txAdvectedCorrectedVelocity, output je txDivergence
		{
			this.txDivergence;
			this.framebuffer.AttachTexture(this.txDivergence, 0);
			
			this.divergence_shader.Bind();
				this.txAdvectedCorrectedVelocity.Bind(0, this.divergence_shader.ULTexture);
				this.divergence_shader.setFloatUniform( this.divergence_shader.ULdT, dT);
				this.divergence_shader.setFloat2Uniform( this.divergence_shader.ULaspect, this.aspect);
				
				this.quad_model.RenderIndexedTriangles(this.divergence_shader);
		}
		
		//5. pressure calc pass: input je txDivergence i txOldPressure, output je txPressure. Jacobi iteration. (vise puta izvrsavanje)
		for(var i = this.NofPressureIterations; i > 0; --i)
		{
			this.txPressure = this.txPressure1;
			this.framebuffer.AttachTexture(this.txPressure, 0);
			
			var dt = dT / this.NofPressureIterations;
			var itime = this.time + dt;
			
			this.pressure_shader.Bind();
				this.txDivergence.Bind(0, this.pressure_shader.ULTextureDivergence);
				this.txOldPressure.Bind(1, this.pressure_shader.ULTexturePressure);
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULdT, dt);
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULTime, itime);
				this.pressure_shader.setFloat2Uniform( this.pressure_shader.ULaspect, this.aspect);
				
				this.quad_model.RenderIndexedTriangles(this.pressure_shader);
				
			//swap pressure
			if(i > 1){
				var temp = this.txPressure0;
				this.txPressure0 = this.txPressure1;
				this.txPressure1 = temp;
				
				this.txOldPressure = this.txPressure0;
			}
		}
		
		//6. divergence free velocity pass: input je txPressure i txAdvectedCorrectedVelocity, output je txVelocity
		{
			this.txVelocity = this.txVelocity2;
			this.framebuffer.AttachTexture(this.txVelocity, 0);
			
			this.divfree_velocity_shader.Bind();
				this.txPressure.Bind(0, this.divfree_velocity_shader.ULTexturePressure);
				this.txAdvectedCorrectedVelocity.Bind(1, this.divfree_velocity_shader.ULTextureVelocity);
				this.divfree_velocity_shader.setFloatUniform( this.divfree_velocity_shader.ULdT, dT);
				this.divfree_velocity_shader.setFloat2Uniform( this.divfree_velocity_shader.ULaspect, this.aspect);
				
				this.quad_model.RenderIndexedTriangles(this.divfree_velocity_shader);
		}
		
		Framebuffer.Bind(oldFB);
		
		this.time += dT;
	}
	
	Display(){
		
		this.display_shader.Bind();
			this.txPressure.Bind(0, this.display_shader.ULTexturePressure);
			this.txVelocity.Bind(1, this.display_shader.ULTextureVelocity);
			this.txDivergence.Bind(2, this.display_shader.ULTextureDivergence);
			this.display_shader.setFloatUniform( this.display_shader.ULdisplayBrightness, this.displayBrightness);
			this.display_shader.setFloatUniform( this.display_shader.ULdT, this.dt);
			this.display_shader.setFloat2Uniform( this.display_shader.ULaspect, this.aspect);
			this.display_shader.setFloatUniform( this.display_shader.ULk, this.kinematicViscosity);
				
			this.quad_model.RenderIndexedTriangles(this.display_shader);
	}

	setKinematicViscosity(v){
		this.kinematicViscosity = v;
	}
	setDisplayBrightness(v){
		this.displayBrightness = v;
	}
	setPressureIterationNumber(count){
		if(count < 1) count = 1;
		if(count > 50) count = 50;
		this.NofPressureIterations = count;
	}
	
	setDisplayType(strDisplay)
	{	
		if(this.strDisplayType != strDisplay)
		{	
			this.strDisplayType = strDisplay;
			
			this.display_shader.RemoveDefine("_DEBUG_Display_Velocity");
			this.display_shader.RemoveDefine("_DEBUG_Display_VelocitySize");
			this.display_shader.RemoveDefine("_DEBUG_Display_Pressure");
			this.display_shader.RemoveDefine("_DEBUG_Display_Divergence");
			this.display_shader.addDefine(strDisplay,"");
			this.display_shader.Recompile(false);
			this.display_shader.InitDefaultAttribLocations();
			this.display_shader.InitDefaultUniformLocations();
				
			this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
			this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
			this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
			this.display_shader.ULk = this.display_shader.getUniformLocation("k");
			this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
			this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
			this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");
		}
	}
	
	RecompileShaders()
	{
		// this.viscosity_shader.addDefine("","");
		if(this.viscosity_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
		
		// this.advection_shader.addDefine("","");
		if(this.advection_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
		
		// this.advection_correction_shader.addDefine("","");
		if(this.advection_correction_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
		
		// this.divergence_shader.addDefine("","");
		if(this.divergence_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
		
		// this.pressure_shader.addDefine("","");
		if(this.pressure_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
		
		// this.divfree_velocity_shader.addDefine("","");
		if(this.divfree_velocity_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
		
		this.display_shader.RemoveAllDefines();
		this.display_shader.addDefine(this.strDisplayType,"");
		this.display_shader.addDefine("Resolution",this.str_vec2Res);
		if(this.display_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.display_shader.InitDefaultAttribLocations();
		this.display_shader.InitDefaultUniformLocations();
		this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
		this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
		this.display_shader.ULk = this.display_shader.getUniformLocation("k");
		this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
		this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
		this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
		this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");		
	}
}

export class FluidSim3D
{
	constructor(w, h, d, vertex, viscosity, advection, advection_correction,
				divergence, pressure, divfree_velocity, display)
	{
		this.quad_model = new Model(-1);
		GenQuadModel(this.quad_model);
		
		this.width = Math.floor(w);
		this.height = Math.floor(h);
		this.depth = Math.floor(d);
		this.aspect = [1.0 / this.width, 1.0 / this.height, 1.0 / this.depth];
		this.str_vec2Res = "vec2(" + this.width.toString()+ ".0," + this.height.toString() + ".0)";
		this.str_vec3Res = "vec3(" + this.width.toString()+ ".0," + this.height.toString() + ".0," + this.depth.toString() + ".0)";
		
		this.viscosity_shader = new Shader(-1);
		this.viscosity_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.viscosity_shader.CompileFromFile(vertex, viscosity) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = -1;
		this.viscosity_shader.ULdT = -1;
		this.viscosity_shader.ULk = -1;
		this.viscosity_shader.ULTextureVelocity = -1;
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
				
		this.advection_shader = new Shader(-1);
		this.advection_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.advection_shader.CompileFromFile(vertex, advection) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = -1;
		this.advection_shader.ULdT = -1;
		this.advection_shader.ULTextureVelocity = -1;
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
				
		this.advection_correction_shader = new Shader(-1);
		this.advection_correction_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.advection_correction_shader.CompileFromFile(vertex, advection_correction) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = -1;
		this.advection_correction_shader.ULdT = -1;
		this.advection_correction_shader.ULTextureVelocity = -1;
		this.advection_correction_shader.ULTextureAdvectedVelocity = -1;
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
				
		this.divergence_shader = new Shader(-1);
		this.divergence_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.divergence_shader.CompileFromFile(vertex, divergence) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = -1;
		this.divergence_shader.ULdT = -1;
		this.divergence_shader.ULTexture = -1;
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
				
		this.pressure_shader = new Shader(-1);
		this.pressure_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.pressure_shader.CompileFromFile(vertex, pressure) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = -1;
		this.pressure_shader.ULdT = -1;
		this.pressure_shader.ULTexturePressure = -1;
		this.pressure_shader.ULTextureDivergence = -1;
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
				
		this.divfree_velocity_shader = new Shader(-1);
		this.divfree_velocity_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.divfree_velocity_shader.CompileFromFile(vertex, divfree_velocity) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = -1;
		this.divfree_velocity_shader.ULdT = -1;
		this.divfree_velocity_shader.ULTexturePressure = -1;
		this.divfree_velocity_shader.ULTextureVelocity = -1;
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
				
		this.display_shader = new Shader(-1);
		this.display_shader.addDefine("_DEBUG_Display_Velocity","");
		this.display_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.display_shader.CompileFromFile(vertex, display) == false) alert("nije kompajliran shader!");
		this.display_shader.InitDefaultAttribLocations();
		this.display_shader.InitDefaultUniformLocations();
		this.display_shader.ULaspect = -1;
		this.display_shader.ULdT = -1;
		this.display_shader.ULk = -1;
		this.display_shader.ULdisplayBrightness = -1;
		this.display_shader.ULTexturePressure = -1;
		this.display_shader.ULTextureVelocity = -1;
		this.display_shader.ULTextureDivergence = -1;
		this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
		this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
		this.display_shader.ULk = this.display_shader.getUniformLocation("k");
		this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
		this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
		this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
		this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");
				
		ShaderList.addShader(this.viscosity_shader);
		ShaderList.addShader(this.advection_shader);
		ShaderList.addShader(this.advection_correction_shader);
		ShaderList.addShader(this.divergence_shader);
		ShaderList.addShader(this.pressure_shader);
		ShaderList.addShader(this.divfree_velocity_shader);
		ShaderList.addShader(this.display_shader);
		
		/*
			texture:
				Velocity_0,Velocity_1,Velocity_2 : xyz float
				Divergence : x float
				Pressure_0,Pressure_1 : x float
		*/
		
		this.txVelocity0 = new Texture3D(-1); this.txVelocity0.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		this.txVelocity1 = new Texture3D(-1); this.txVelocity1.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		this.txVelocity2 = new Texture3D(-1); this.txVelocity2.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		
		//ovo swappa 
		this.txDiffusedVelocity = this.txVelocity0;
		this.txAdvectedVelocity = this.txVelocity1;
		this.txVelocity = this.txVelocity2;
		this.txOldVelocity = this.txVelocity0;
		
		//ovo mozda optimizirat i strpat ove tri teksture kao komponente txAdvectedVelocity (ili one koja se ne koristi)?
		this.txDivergence = new Texture3D(-1);this.txDivergence.CreateEmptyRfloat32(this.width, this.height, this.depth);
		this.txPressure0 = new Texture3D(-1);  this.txPressure0.CreateEmptyRfloat32(this.width, this.height, this.depth);
		this.txPressure1 = new Texture3D(-1);  this.txPressure1.CreateEmptyRfloat32(this.width, this.height, this.depth);
		
		this.txPressure = this.txPressure0;
		this.txOldPressure = this.txPressure1;
		
		// this.txDepth = new Texture(-1); this.txDepth.CreateEmptyDepthfloat(this.width, this.height);
		
		TextureList.addTexture(this.txVelocity0);
		TextureList.addTexture(this.txVelocity1);
		TextureList.addTexture(this.txVelocity2);
		TextureList.addTexture(this.txDivergence);
		TextureList.addTexture(this.txPressure0);
		TextureList.addTexture(this.txPressure1);
		// TextureList.addTexture(this.txDepth);
		
		this.txVelocity0.setMinMagFilterLinearLinear();
		this.txVelocity1.setMinMagFilterLinearLinear();
		this.txVelocity2.setMinMagFilterLinearLinear();
		this.txDivergence.setMinMagFilterLinearLinear();
		this.txPressure0.setMinMagFilterLinearLinear();
		this.txPressure1.setMinMagFilterLinearLinear();
		
		this.txVelocity0.setWrapTypeClampToEdge();
		this.txVelocity1.setWrapTypeClampToEdge();
		this.txVelocity2.setWrapTypeClampToEdge();
		this.txDivergence.setWrapTypeClampToEdge();
		this.txPressure0.setWrapTypeClampToEdge();
		this.txPressure1.setWrapTypeClampToEdge();
		
		//framebuffer
		this.framebuffer = new Framebuffer(false); this.framebuffer.Create();
		// this.framebuffer.AttachDepth(this.txDepth);
		
		this.kinematicViscosity = 1.0;
		
		this.strDisplayType = "";
		this.dt = 0.01;
		this.time = 0.0;
		this.displayBrightness = 1.0;
		
		this.NofPressureIterations = 1;
	}
	
	ClearBuffers()
	{
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		// this.framebuffer.AttachDepth(this.txDepth);
		// this.framebuffer.CheckStatus();
		
		gl.viewport(0, 0, this.width, this.height);
		
		gl.disable(gl.DEPTH_TEST);
		gl.clearColor(0.0, 0.95, 0.6, 1.0);
		// gl.clearDepth(1.0);
		
		var buffers = [this.txVelocity0, this.txVelocity1, this.txVelocity2,
						this.txDivergence, this.txPressure0, this.txPressure1];
		
		for(let z = 0; z < this.depth; ++z)
		{	
			/* this.framebuffer.AttachTextureLayer(this.txVelocity0, 0, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			this.framebuffer.AttachTextureLayer(this.txVelocity1, 1, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			this.framebuffer.AttachTextureLayer(this.txVelocity2, 2, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			this.framebuffer.AttachTextureLayer(this.txDivergence, 3, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			this.framebuffer.AttachTextureLayer(this.txPressure0, 4, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			this.framebuffer.AttachTextureLayer(this.txPressure1, 5, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); */
			
			this.framebuffer.AttachMultipleLayer(buffers, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
		this.framebuffer.DetachAllTextures();
				
		Framebuffer.Bind(oldFB);
	}
	
	SimStep(dT){
		/* 
			swap textura: velocity i pressure
			viscosity pass: input je txOldVelocity, output je txDiffusedVelocity
			force add pass -> zasad ne
			advection pass: input je txDiffusedVelocity, output je txAdvectedVelocity
			advection correction pass: input je txAdvectedVelocity, output je txAdvectedCorrectedVelocity
			divergence pass na velocity: input je txAdvectedCorrectedVelocity, output je txDivergence
			pressure calc pass: input je txDivergence i txOldPressure, output je txPressure
			divergence free velocity pass: input je txPressure i txAdvectedCorrectedVelocity, output je txVelocity
			display u mainu
		*/
		
		//ToDo: kad proradi za 3D, pokusati izbaciti postavljanje uniformova iz loop-ova (uglavnom je moguce sve skroz izvan loopova)
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		gl.viewport(0, 0, this.width, this.height);
		this.dt = dT;
		gl.disable(gl.BLEND);
		
		//0. swap textura: velocity i pressure. ovo je na pocetku SimStep samo.
		{
			var temp = this.txVelocity0;
			this.txVelocity0 = this.txVelocity2;
			this.txVelocity2 = temp;
			
			this.txOldVelocity = this.txVelocity0;
			
			temp = this.txPressure0;
			this.txPressure0 = this.txPressure1;
			this.txPressure1 = temp;
			
			this.txOldPressure = this.txPressure0;
		}
		
		for(let z = 0; z < this.depth; z += 8)
		{
			//1. viscosity pass: input je txOldVelocity, output je txDiffusedVelocity
			{
				this.txDiffusedVelocity = this.txVelocity1;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txDiffusedVelocity, l, z+l);
				
				this.viscosity_shader.Bind();
					this.txOldVelocity.Bind(0, this.viscosity_shader.ULTextureVelocity);
					this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULdT, dT);
					this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULk, this.kinematicViscosity);
					this.viscosity_shader.setFloat3Uniform( this.viscosity_shader.ULaspect, this.aspect );
					this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULTime, this.time);
					
					this.quad_model.RenderIndexedTriangles(this.viscosity_shader);	
			}
		}
		
		for(let z = 0; z < this.depth; z += 8)
		{
			//2. advection pass: input je txDiffusedVelocity, output je txAdvectedVelocity
			{
				this.txAdvectedVelocity = this.txVelocity2;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txAdvectedVelocity, l, z+l);
				
				this.advection_shader.Bind();
					this.txDiffusedVelocity.Bind(0, this.advection_shader.ULTextureVelocity);
					this.advection_shader.setFloatUniform( this.advection_shader.ULdT, dT);
					this.advection_shader.setFloat3Uniform( this.advection_shader.ULaspect, this.aspect);
					
					this.quad_model.RenderIndexedTriangles(this.advection_shader);
			}
		}
		
		for(let z = 0; z < this.depth; z += 8)
		{	
			//3. advection correction pass: input je txAdvectedVelocity i txDiffusedVelocity, output je txAdvectedCorrectedVelocity
			{
				this.txAdvectedCorrectedVelocity = this.txVelocity0;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txAdvectedCorrectedVelocity, l, z+l);
				
				this.advection_correction_shader.Bind();
					this.txAdvectedVelocity.Bind(0, this.advection_correction_shader.ULTextureAdvectedVelocity);
					this.txDiffusedVelocity.Bind(1, this.advection_correction_shader.ULTextureVelocity);
					this.advection_correction_shader.setFloatUniform( this.advection_correction_shader.ULdT, dT);
					this.advection_correction_shader.setFloat3Uniform( this.advection_correction_shader.ULaspect, this.aspect);
					
					this.quad_model.RenderIndexedTriangles(this.advection_correction_shader);
			}
		}
		
		for(let z = 0; z < this.depth; z += 8)
		{	
			//4. divergence pass na velocity: input je txAdvectedCorrectedVelocity, output je txDivergence
			{
				this.txDivergence;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txDivergence, l, z+l);
				
				this.divergence_shader.Bind();
					this.txAdvectedCorrectedVelocity.Bind(0, this.divergence_shader.ULTexture);
					this.divergence_shader.setFloatUniform( this.divergence_shader.ULdT, dT);
					this.divergence_shader.setFloat3Uniform( this.divergence_shader.ULaspect, this.aspect);
					
					this.quad_model.RenderIndexedTriangles(this.divergence_shader);
			}
		}
		
		//5. pressure calc pass: input je txDivergence i txOldPressure, output je txPressure. Jacobi iteration. (vise puta izvrsavanje)
		for(let i = this.NofPressureIterations; i > 0; --i)
		{
			for(let z = 0; z < this.depth; z += 8)
			{
				this.txPressure = this.txPressure1;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txPressure, l, z+l);
				
				var dt = dT / this.NofPressureIterations;
				var itime = this.time + dt;
				
				this.pressure_shader.Bind();
					this.txDivergence.Bind(0, this.pressure_shader.ULTextureDivergence);
					this.txOldPressure.Bind(1, this.pressure_shader.ULTexturePressure);
					this.pressure_shader.setFloatUniform( this.pressure_shader.ULdT, dt);
					this.pressure_shader.setFloatUniform( this.pressure_shader.ULTime, itime);
					this.pressure_shader.setFloat3Uniform( this.pressure_shader.ULaspect, this.aspect);
					
					this.quad_model.RenderIndexedTriangles(this.pressure_shader);
					
			}
			//swap pressure
			if(i > 1){
				var temp = this.txPressure0;
				this.txPressure0 = this.txPressure1;
				this.txPressure1 = temp;
				
				this.txOldPressure = this.txPressure0;
			}
		}
		
		for(let z = 0; z < this.depth; z += 8)
		{	
			//6. divergence free velocity pass: input je txPressure i txAdvectedCorrectedVelocity, output je txVelocity
			{
				this.txVelocity = this.txVelocity2;
				for(let l = 0; l < 8; ++l)
					this.framebuffer.AttachTextureLayer(this.txVelocity, l, z+l);
				
				this.divfree_velocity_shader.Bind();
					this.txPressure.Bind(0, this.divfree_velocity_shader.ULTexturePressure);
					this.txAdvectedCorrectedVelocity.Bind(1, this.divfree_velocity_shader.ULTextureVelocity);
					this.divfree_velocity_shader.setFloatUniform( this.divfree_velocity_shader.ULdT, dT);
					this.divfree_velocity_shader.setFloat3Uniform( this.divfree_velocity_shader.ULaspect, this.aspect);
					
					this.quad_model.RenderIndexedTriangles(this.divfree_velocity_shader);
			}		
		}
		
		Framebuffer.Bind(oldFB);
		
		this.time += dT;
	}
	
	Display(){
		
		this.display_shader.Bind();
			this.txPressure.Bind(0, this.display_shader.ULTexturePressure);
			this.txVelocity.Bind(1, this.display_shader.ULTextureVelocity);
			this.txDivergence.Bind(2, this.display_shader.ULTextureDivergence);
			this.display_shader.setFloatUniform( this.display_shader.ULdisplayBrightness, this.displayBrightness);
			this.display_shader.setFloatUniform( this.display_shader.ULdT, this.dt);
			this.display_shader.setFloat3Uniform( this.display_shader.ULaspect, this.aspect);
			this.display_shader.setFloatUniform( this.display_shader.ULk, this.kinematicViscosity);
				
			this.quad_model.RenderIndexedTriangles(this.display_shader);
	}

	CreateTest3DRenderShader(fragment_shader)
	{
		if(this.viscosity_shader == 'undefined' || this.viscosity_shader == null) return false;
		
		this.shader3DRender = new Shader(-1);//test_3d_texture_render "fluidsim_quad_surface_shader", "test_3d_texture_render"
		this.shader3DRender.addDefine("Resolution",this.str_vec3Res);
		if(this.shader3DRender.CompileFromFile(this.viscosity_shader.VertexShaderName, fragment_shader) == false) alert("nije kompajliran shader!");
		this.shader3DRender.InitDefaultAttribLocations();
		this.shader3DRender.InitDefaultUniformLocations();
		this.shader3DRender.ULz = this.shader3DRender.getUniformLocation("z");
		this.shader3DRender.ULdT = this.shader3DRender.getUniformLocation("dT");
		
		ShaderList.addShader(this.shader3DRender);
		
		return true;
	}
	
	Test3DRender()
	{
		if(this.shader3DRender == 'undefined' || this.shader3DRender == null) return;
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		
		gl.viewport(0, 0, this.width, this.height);
		
		this.shader3DRender.Bind();
		this.shader3DRender.setFloatUniform(this.shader3DRender.ULTime, this.time);
		this.shader3DRender.setFloatUniform(this.shader3DRender.ULdT, 0.1);
		
		for(let z = 0; z < this.depth; z += 8)
		{
			for(let l = 0; l < 8; ++l)
				this.framebuffer.AttachTextureLayer(this.txVelocity0, l, z+l);
			this.framebuffer.CheckStatus();
			
			this.shader3DRender.setIntUniform(this.shader3DRender.ULz, z);			
			this.quad_model.RenderIndexedTriangles(this.shader3DRender);	
		}
		this.framebuffer.DetachAllTextures(); //potrebno je kod sljedecih poziva framebuffer.Bind() moze ostat bindane teksture na out
				
		Framebuffer.Bind(oldFB);
	}
	
	setKinematicViscosity(v){
		this.kinematicViscosity = v;
	}
	setDisplayBrightness(v){
		this.displayBrightness = v;
	}
	setPressureIterationNumber(count){
		if(count < 1) count = 1;
		if(count > 50) count = 50;
		this.NofPressureIterations = count;
	}
	
	setDisplayType(strDisplay)
	{	
		if(this.strDisplayType != strDisplay)
		{	
			this.strDisplayType = strDisplay;
			
			this.display_shader.RemoveDefine("_DEBUG_Display_Velocity");
			this.display_shader.RemoveDefine("_DEBUG_Display_VelocitySize");
			this.display_shader.RemoveDefine("_DEBUG_Display_Pressure");
			this.display_shader.RemoveDefine("_DEBUG_Display_Divergence");
			this.display_shader.addDefine(strDisplay,"");
			this.display_shader.Recompile(false);
			this.display_shader.InitDefaultAttribLocations();
			this.display_shader.InitDefaultUniformLocations();
				
			this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
			this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
			this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
			this.display_shader.ULk = this.display_shader.getUniformLocation("k");
			this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
			this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
			this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");
		}
	}
	
	RecompileShaders()
	{
		// this.viscosity_shader.addDefine("","");
		if(this.viscosity_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
		
		// this.advection_shader.addDefine("","");
		if(this.advection_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
		
		// this.advection_correction_shader.addDefine("","");
		if(this.advection_correction_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
		
		// this.divergence_shader.addDefine("","");
		if(this.divergence_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
		
		// this.pressure_shader.addDefine("","");
		if(this.pressure_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
		
		// this.divfree_velocity_shader.addDefine("","");
		if(this.divfree_velocity_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
		
		this.display_shader.RemoveAllDefines();
		this.display_shader.addDefine(this.strDisplayType,"");
		this.display_shader.addDefine("Resolution",this.str_vec3Res);
		if(this.display_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.display_shader.InitDefaultAttribLocations();
		this.display_shader.InitDefaultUniformLocations();
		this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
		this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
		this.display_shader.ULk = this.display_shader.getUniformLocation("k");
		this.display_shader.ULdisplayBrightness = this.display_shader.getUniformLocation("displayBrightness");
		this.display_shader.ULTexturePressure = this.display_shader.getUniformLocation("txPressure");
		this.display_shader.ULTextureVelocity = this.display_shader.getUniformLocation("txVelocity");
		this.display_shader.ULTextureDivergence = this.display_shader.getUniformLocation("txVelocityDivergence");		
	}
}




