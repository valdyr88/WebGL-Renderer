import { gl, WriteDebug } from "./glContext.js";
import { CShader, CShaderList } from "./glShader.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { CTexture, CTexture3D, CTextureList } from "./glTexture.js";
import { CModel, GenQuadModel } from "./glModel.js"
import { CFramebuffer } from "./glFramebuffer.js";

export class CFluidSim2D
{
	constructor(w, h, vertex, viscosity, advection, advection_correction,
				divergence, pressure, divfree_velocity, display)
	{
		this.quad_model = new CModel(-1);
		GenQuadModel(this.quad_model);
		
		this.width = Math.floor(w);
		this.height = Math.floor(h);
		this.aspect = [1.0 / this.width, 1.0 / this.height];
		this.str_vec2Res = "vec2(" + this.width.toString()+ ".0," + this.height.toString() + ".0)";
		
		this.viscosity_shader = new CShader(-1);
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
				
		this.advection_shader = new CShader(-1);
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
				
		this.advection_correction_shader = new CShader(-1);
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
				
		this.divergence_shader = new CShader(-1);
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
				
		this.pressure_shader = new CShader(-1);
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
				
		this.divfree_velocity_shader = new CShader(-1);
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
				
		this.display_shader = new CShader(-1);
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
				
		CShaderList.addShader(this.viscosity_shader);
		CShaderList.addShader(this.advection_shader);
		CShaderList.addShader(this.advection_correction_shader);
		CShaderList.addShader(this.divergence_shader);
		CShaderList.addShader(this.pressure_shader);
		CShaderList.addShader(this.divfree_velocity_shader);
		CShaderList.addShader(this.display_shader);
		
		/*
			texture:
				Velocity_0,Velocity_1,Velocity_2 : xyz float
				Divergence : x float
				Pressure_0,Pressure_1 : x float
		*/
		
		this.txVelocity0 = new CTexture(-1); this.txVelocity0.CreateEmptyRGBAfloat32(this.width, this.height);
		this.txVelocity1 = new CTexture(-1); this.txVelocity1.CreateEmptyRGBAfloat32(this.width, this.height);
		this.txVelocity2 = new CTexture(-1); this.txVelocity2.CreateEmptyRGBAfloat32(this.width, this.height);
		
		//ovo swappa 
		this.txDiffusedVelocity = this.txVelocity0;
		this.txAdvectedVelocity = this.txVelocity1;
		this.txVelocity = this.txVelocity2;
		this.txOldVelocity = this.txVelocity0;
		
		//ovo mozda optimizirat i strpat ove tri teksture kao komponente txAdvectedVelocity (ili one koja se ne koristi)?
		this.txDivergence = new CTexture(-1); this.txDivergence.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure0 = new CTexture(-1); this.txPressure0.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure1 = new CTexture(-1); this.txPressure1.CreateEmptyRfloat32(this.width, this.height);
		
		this.txPressure = this.txPressure0;
		this.txOldPressure = this.txPressure1;
		
		// this.txDepth = new CTexture(-1); this.txDepth.CreateEmptyDepthfloat(this.width, this.height);
		
		CTextureList.addTexture(this.txVelocity0);
		CTextureList.addTexture(this.txVelocity1);
		CTextureList.addTexture(this.txVelocity2);
		CTextureList.addTexture(this.txDivergence);
		CTextureList.addTexture(this.txPressure0);
		CTextureList.addTexture(this.txPressure1);
		// CTextureList.addTexture(this.txDepth);
		
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
		this.framebuffer = new CFramebuffer(false); this.framebuffer.Create();
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
		
		CFramebuffer.Bind(oldFB);
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
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULdT, dT);
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULTime, this.time);
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
		
		CFramebuffer.Bind(oldFB);
		
		this.time += dT;
	}
	
	Display(){
		
		this.display_shader.Bind();
			this.txPressure.Bind(0, this.display_shader.ULTexturePressure);
			this.txVelocity.Bind(1, this.display_shader.ULTextureVelocity);
			this.txDivergence.Bind(2, this.display_shader.ULTextureDivergence);
			this.display_shader.setFloatUniform( this.display_shader.ULTime, this.time);
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

export class CFluidSim3D
{
	constructor(w, h, d, vertex, viscosity, advection, advection_correction,
				divergence, pressure, divfree_velocity, display)
	{
		this.NumOutBuffers = 8;
		this.bUseMultipleFramebuffers = true;
		
		this.fbVelocity0 = [];
		this.fbVelocity1 = [];
		this.fbVelocity2 = [];
		this.fbPressure0 = [];
		this.fbPressure1 = [];
		this.fbDivergence = [];
		
		this.quad_model = new CModel(-1);
		GenQuadModel(this.quad_model);
		
		this.width = Math.floor(w);
		this.height = Math.floor(h);
		this.depth = Math.floor(d/this.NumOutBuffers)*this.NumOutBuffers;
		this.aspect = [1.0 / this.width, 1.0 / this.height, 1.0 / this.depth];
		this.str_vec2Res = "vec2(" + this.width.toString()+ ".0," + this.height.toString() + ".0)";
		this.str_vec3Res = "vec3(" + this.width.toString()+ ".0," + this.height.toString() + ".0," + this.depth.toString() + ".0)";
		
		this.str_WriteOutBuffers = "";
		for(let i = 0; i < this.NumOutBuffers; ++i){
			this.str_WriteOutBuffers += "out_buffer[" + i.toString() + "] = out_variable[" + i.toString() + "];";
		}
		
		this.viscosity_shader = new CShader(-1);
		this.viscosity_shader.addDefine("Resolution",this.str_vec3Res);
		this.viscosity_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.viscosity_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.viscosity_shader.CompileFromFile(vertex, viscosity) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = -1;
		this.viscosity_shader.ULdT = -1;
		this.viscosity_shader.ULk = -1;
		this.viscosity_shader.ULTextureVelocity = -1;
		this.viscosity_shader.ULz = -1;
		this.viscosity_shader.ULz = this.viscosity_shader.getUniformLocation("z");
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
		
		this.pre_viscosity_pass_function = function(){};
			
		this.advection_shader = new CShader(-1);
		this.advection_shader.addDefine("Resolution",this.str_vec3Res);
		this.advection_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.advection_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.advection_shader.CompileFromFile(vertex, advection) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = -1;
		this.advection_shader.ULdT = -1;
		this.advection_shader.ULTextureVelocity = -1;
		this.advection_shader.ULz = -1;
		this.advection_shader.ULz = this.advection_shader.getUniformLocation("z");
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
				
		this.pre_advection_pass_function = function(){};
		
		this.advection_correction_shader = new CShader(-1);
		this.advection_correction_shader.addDefine("Resolution",this.str_vec3Res);
		this.advection_correction_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.advection_correction_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.advection_correction_shader.CompileFromFile(vertex, advection_correction) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = -1;
		this.advection_correction_shader.ULdT = -1;
		this.advection_correction_shader.ULTextureVelocity = -1;
		this.advection_correction_shader.ULTextureAdvectedVelocity = -1;
		this.advection_correction_shader.ULz = -1;
		this.advection_correction_shader.ULz = this.advection_correction_shader.getUniformLocation("z");
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
				
		this.pre_advection_correction_pass_function = function(){};
		
		this.divergence_shader = new CShader(-1);
		this.divergence_shader.addDefine("Resolution",this.str_vec3Res);
		this.divergence_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.divergence_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.divergence_shader.CompileFromFile(vertex, divergence) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = -1;
		this.divergence_shader.ULdT = -1;
		this.divergence_shader.ULTexture = -1;
		this.divergence_shader.ULz = -1;
		this.divergence_shader.ULz = this.divergence_shader.getUniformLocation("z");
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
				
		this.pre_divergence_pass_function = function(){};
		
		this.pressure_shader = new CShader(-1);
		this.pressure_shader.addDefine("Resolution",this.str_vec3Res);
		this.pressure_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.pressure_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.pressure_shader.CompileFromFile(vertex, pressure) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = -1;
		this.pressure_shader.ULdT = -1;
		this.pressure_shader.ULTexturePressure = -1;
		this.pressure_shader.ULTextureDivergence = -1;
		this.pressure_shader.ULz = -1;
		this.pressure_shader.ULz = this.pressure_shader.getUniformLocation("z");
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
				
		this.pre_pressure_pass_function = function(){};
		
		this.divfree_velocity_shader = new CShader(-1);
		this.divfree_velocity_shader.addDefine("Resolution",this.str_vec3Res);
		this.divfree_velocity_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.divfree_velocity_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.divfree_velocity_shader.CompileFromFile(vertex, divfree_velocity) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = -1;
		this.divfree_velocity_shader.ULdT = -1;
		this.divfree_velocity_shader.ULTexturePressure = -1;
		this.divfree_velocity_shader.ULTextureVelocity = -1;
		this.divfree_velocity_shader.ULz = -1;
		this.divfree_velocity_shader.ULz = this.divfree_velocity_shader.getUniformLocation("z");
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
				
		this.pre_divfree_velocity_pass_function = function(){};
		
		this.display_shader = new CShader(-1);
		this.display_shader.addDefine("_DEBUG_Display_Velocity","");
		this.display_shader.addDefine("Resolution",this.str_vec3Res);
		this.display_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
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
		
		this.on_recompile_fluidsim_shaders = function(){};
		
		CShaderList.addShader(this.viscosity_shader);
		CShaderList.addShader(this.advection_shader);
		CShaderList.addShader(this.advection_correction_shader);
		CShaderList.addShader(this.divergence_shader);
		CShaderList.addShader(this.pressure_shader);
		CShaderList.addShader(this.divfree_velocity_shader);
		CShaderList.addShader(this.display_shader);
		
		/*
			texture:
				Velocity_0,Velocity_1,Velocity_2 : xyz float
				Divergence : x float
				Pressure_0,Pressure_1 : x float
		*/
		
		this.txVelocity0 = new CTexture3D(-1); this.txVelocity0.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		this.txVelocity1 = new CTexture3D(-1); this.txVelocity1.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		this.txVelocity2 = new CTexture3D(-1); this.txVelocity2.CreateEmptyRGBAfloat32(this.width, this.height, this.depth);
		
		//ovo swappa 
		this.txDiffusedVelocity = this.txVelocity0;
		this.txAdvectedVelocity = this.txVelocity1;
		this.txVelocity = this.txVelocity2;
		this.txOldVelocity = this.txVelocity0;
		
		//ovo mozda optimizirat i strpat ove tri teksture kao komponente txAdvectedVelocity (ili one koja se ne koristi)?
		this.txDivergence = new CTexture3D(-1);this.txDivergence.CreateEmptyRfloat32(this.width, this.height, this.depth);
		this.txPressure0 = new CTexture3D(-1);  this.txPressure0.CreateEmptyRfloat32(this.width, this.height, this.depth);
		this.txPressure1 = new CTexture3D(-1);  this.txPressure1.CreateEmptyRfloat32(this.width, this.height, this.depth);
		
		this.txPressure = this.txPressure0;
		this.txOldPressure = this.txPressure1;
		
		// this.txDepth = new CTexture(-1); this.txDepth.CreateEmptyDepthfloat(this.width, this.height);
		
		CTextureList.addTexture(this.txVelocity0);
		CTextureList.addTexture(this.txVelocity1);
		CTextureList.addTexture(this.txVelocity2);
		CTextureList.addTexture(this.txDivergence);
		CTextureList.addTexture(this.txPressure0);
		CTextureList.addTexture(this.txPressure1);
		// CTextureList.addTexture(this.txDepth);
		
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
		this.framebuffer = new CFramebuffer(false); this.framebuffer.Create();
		// this.framebuffer.AttachDepth(this.txDepth);
		
		//framebuffers
		/*
			this.fbVelocity0 = [];
			this.fbVelocity1 = [];
			this.fbVelocity2 = [];
			this.fbPressure0 = [];
			this.fbPressure1 = [];
			this.fbDivergence = [];
		*/
		//---------------------------------------------------------------------
		let fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbVelocity0[fb] = new CFramebuffer(false); this.fbVelocity0[fb].Create();
			this.fbVelocity0[fb].bAutoSetupUsage = false;
		
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbVelocity0[fb].AttachTextureLayer(this.txVelocity0, l, z+l);
			this.fbVelocity0[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbVelocity1[fb] = new CFramebuffer(false); this.fbVelocity1[fb].Create();
			this.fbVelocity1[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbVelocity1[fb].AttachTextureLayer(this.txVelocity1, l, z+l);
			this.fbVelocity1[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbVelocity2[fb] = new CFramebuffer(false); this.fbVelocity2[fb].Create();
			this.fbVelocity2[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbVelocity2[fb].AttachTextureLayer(this.txVelocity2, l, z+l);
			this.fbVelocity2[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbPressure0[fb] = new CFramebuffer(false); this.fbPressure0[fb].Create();
			this.fbPressure0[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbPressure0[fb].AttachTextureLayer(this.txPressure0, l, z+l);
			this.fbPressure0[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbPressure1[fb] = new CFramebuffer(false); this.fbPressure1[fb].Create();
			this.fbPressure1[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbPressure1[fb].AttachTextureLayer(this.txPressure1, l, z+l);
			this.fbPressure1[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbDivergence[fb] = new CFramebuffer(false); this.fbDivergence[fb].Create();
			this.fbDivergence[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbDivergence[fb].AttachTextureLayer(this.txDivergence, l, z+l);
			this.fbDivergence[fb].SetupUsage();
			++fb;
		}
		fb = 0;		
		//---------------------------------------------------------------------
		
		this.kinematicViscosity = 1.0;
		
		this.strDisplayType = "";
		this.dt = 0.01;
		this.time = 0.0;
		this.displayBrightness = 1.0;
		
		this.NofPressureIterations = 1;
	}

	ToggleFramebufferUsage(){
		this.bUseMultipleFramebuffers = !this.bUseMultipleFramebuffers;
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
		this.framebuffer.DetachAllTextures();
		
		var buffers = [this.txVelocity0, this.txVelocity1, this.txVelocity2,
						this.txDivergence, this.txPressure0, this.txPressure1];
		
		for(let z = 0; z < this.depth; ++z)
		{				
			this.framebuffer.AttachMultipleLayer(buffers, z);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
		this.framebuffer.DetachAllTextures();
				
		CFramebuffer.Bind(oldFB);
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
		
		//ToDo: kad proradi za 3D, pokusati izbaciti postavljanje uniformova iz loop-ova (moguce je skoro sve skroz izvan loopova (samo ULz treba u loopu))
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		this.framebuffer.bAutoSetupUsage = false;
		gl.viewport(0, 0, this.width, this.height);
		this.dt = dT;
		gl.disable(gl.BLEND);
		let fb = 0;
		
		//0. swap textura: velocity i pressure. ovo je na pocetku SimStep samo.
		{
			let temp = this.txVelocity0;
			this.txVelocity0 = this.txVelocity2;
			this.txVelocity2 = temp;
			temp = this.fbVelocity0;
			this.fbVelocity0 = this.fbVelocity2;
			this.fbVelocity2 = temp;
			
			this.txOldVelocity = this.txVelocity0;
			
			temp = this.txPressure0;
			this.txPressure0 = this.txPressure1;
			this.txPressure1 = temp;
			temp = this.fbPressure0;
			this.fbPressure0 = this.fbPressure1;
			this.fbPressure1 = temp;
			
			this.txOldPressure = this.txPressure0;
		}
		
		//1. viscosity pass: input je txOldVelocity, output je txDiffusedVelocity
		{
			this.txDiffusedVelocity = this.txVelocity1;
			this.fbDiffusedVelocity = this.fbVelocity1;
			fb = 0;
			
			this.viscosity_shader.Bind();
				this.txOldVelocity.Bind(0, this.viscosity_shader.ULTextureVelocity);
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULdT, dT);
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULk, this.kinematicViscosity);
				this.viscosity_shader.setFloat3Uniform( this.viscosity_shader.ULaspect, this.aspect );
				this.viscosity_shader.setFloatUniform( this.viscosity_shader.ULTime, this.time);
			
			this.pre_viscosity_pass_function();
			
			for(let z = 0; z < this.depth; z += this.NumOutBuffers)
			{
				if(this.bUseMultipleFramebuffers == true){
					this.fbDiffusedVelocity[fb].Bind(); fb++; }
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txDiffusedVelocity, l, z+l);
					this.framebuffer.SetupUsage();
				}				
				this.viscosity_shader.setIntUniform(this.viscosity_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.viscosity_shader);	
			}
		}
		// this.framebuffer.DetachAllTextures();
		
		//2. advection pass: input je txDiffusedVelocity, output je txAdvectedVelocity
		{
			this.txAdvectedVelocity = this.txVelocity2;
			this.fbAdvectedVelocity = this.fbVelocity2;
			fb = 0;
					
			this.advection_shader.Bind();
				this.txDiffusedVelocity.Bind(0, this.advection_shader.ULTextureVelocity);
				this.advection_shader.setFloatUniform( this.advection_shader.ULdT, dT);
				this.advection_shader.setFloat3Uniform( this.advection_shader.ULaspect, this.aspect);
			
			this.pre_advection_pass_function();
			
			for(let z = 0; z < this.depth; z += this.NumOutBuffers)
			{
				if(this.bUseMultipleFramebuffers == true){
					this.fbAdvectedVelocity[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txAdvectedVelocity, l, z+l);
					this.framebuffer.SetupUsage();
				}				
				this.advection_shader.setIntUniform(this.advection_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.advection_shader);
			}
		}
		// this.framebuffer.DetachAllTextures();
		
		//3. advection correction pass: input je txAdvectedVelocity i txDiffusedVelocity, output je txAdvectedCorrectedVelocity
		{
			this.txAdvectedCorrectedVelocity = this.txVelocity0;
			this.fbAdvectedCorrectedVelocity = this.fbVelocity0;
			fb = 0;
					
				this.advection_correction_shader.Bind();
					this.txAdvectedVelocity.Bind(0, this.advection_correction_shader.ULTextureAdvectedVelocity);
					this.txDiffusedVelocity.Bind(1, this.advection_correction_shader.ULTextureVelocity);
					this.advection_correction_shader.setFloatUniform( this.advection_correction_shader.ULdT, dT);
					this.advection_correction_shader.setFloat3Uniform( this.advection_correction_shader.ULaspect, this.aspect);
			
			this.pre_advection_correction_pass_function();
					
			for(let z = 0; z < this.depth; z += this.NumOutBuffers)
			{	
				if(this.bUseMultipleFramebuffers == true){
					this.fbAdvectedCorrectedVelocity[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txAdvectedCorrectedVelocity, l, z+l);
					this.framebuffer.SetupUsage();
				}					
				this.advection_correction_shader.setIntUniform(this.advection_correction_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.advection_correction_shader);
			}
		}
		// this.framebuffer.DetachAllTextures();
		
		//4. divergence pass na velocity: input je txAdvectedCorrectedVelocity, output je txDivergence
		{
			this.txDivergence;
			this.fbDivergence;
			fb = 0;
			
			this.divergence_shader.Bind();
				this.txAdvectedCorrectedVelocity.Bind(0, this.divergence_shader.ULTexture);
				this.divergence_shader.setFloatUniform( this.divergence_shader.ULdT, dT);
				this.divergence_shader.setFloat3Uniform( this.divergence_shader.ULaspect, this.aspect);
			
			this.pre_divergence_pass_function();
			
			for(let z = 0; z < this.depth; z += this.NumOutBuffers)
			{	
				if(this.bUseMultipleFramebuffers == true){
					this.fbDivergence[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txDivergence, l, z+l);
					this.framebuffer.SetupUsage();
				}
				this.divergence_shader.setIntUniform(this.divergence_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.divergence_shader);
			}
		}
		// this.framebuffer.DetachAllTextures();
		
		//5. pressure calc pass: input je txDivergence i txOldPressure, output je txPressure. Jacobi iteration. (vise puta izvrsavanje)
		{
			var dt = dT / this.NofPressureIterations;
			// var itime = this.time - dt;
			this.pressure_shader.Bind();
				this.txDivergence.Bind(0, this.pressure_shader.ULTextureDivergence);
				this.pressure_shader.setFloat3Uniform( this.pressure_shader.ULaspect, this.aspect);
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULdT, dT);
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULTime, this.time);
			
			this.pre_pressure_pass_function();
			
			for(let i = this.NofPressureIterations; i > 0; --i)
			{
				this.txPressure = this.txPressure1;
				this.txOldPressure.Bind(1, this.pressure_shader.ULTexturePressure);
				this.fbPressure = this.fbPressure1;
				fb = 0;
				
				/* itime = itime + dt;
				this.pressure_shader.setFloatUniform( this.pressure_shader.ULTime, itime); */
				
				for(let z = 0; z < this.depth; z += this.NumOutBuffers)
				{
					if(this.bUseMultipleFramebuffers == true){
						this.fbPressure[fb].Bind(); ++fb;}
					else{
						for(let l = 0; l < this.NumOutBuffers; ++l)
							this.framebuffer.AttachTextureLayer(this.txPressure, l, z+l);
						this.framebuffer.SetupUsage();
					}
					this.pressure_shader.setIntUniform(this.pressure_shader.ULz, z);
					this.quad_model.RenderIndexedTriangles(this.pressure_shader);
						
				}
				//swap pressure
				if(i > 1){
					let temp = this.txPressure0;
					this.txPressure0 = this.txPressure1;
					this.txPressure1 = temp;
					temp = this.fbPressure0;
					this.fbPressure0 = this.fbPressure1;
					this.fbPressure1 = temp;
					
					this.txOldPressure = this.txPressure0;
				}
			}
		}
		// this.framebuffer.DetachAllTextures();
		
		//6. divergence free velocity pass: input je txPressure i txAdvectedCorrectedVelocity, output je txVelocity
		{
			this.txVelocity = this.txVelocity2;
			this.fbVelocity = this.fbVelocity2;
			fb = 0;
			
			this.divfree_velocity_shader.Bind();
				this.txPressure.Bind(0, this.divfree_velocity_shader.ULTexturePressure);
				this.txAdvectedCorrectedVelocity.Bind(1, this.divfree_velocity_shader.ULTextureVelocity);
				this.divfree_velocity_shader.setFloatUniform( this.divfree_velocity_shader.ULdT, dT);
				this.divfree_velocity_shader.setFloat3Uniform( this.divfree_velocity_shader.ULaspect, this.aspect);
			
			this.pre_divfree_velocity_pass_function();
			
			for(let z = 0; z < this.depth; z += this.NumOutBuffers)
			{	
				if(this.bUseMultipleFramebuffers == true){
					this.fbVelocity[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txVelocity, l, z+l);
					this.framebuffer.SetupUsage();
				}
				this.divfree_velocity_shader.setIntUniform(this.divfree_velocity_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.divfree_velocity_shader);
			}
		}
		// this.framebuffer.DetachAllTextures();
		// this.framebuffer.bAutoSetupUsage = true;
		
		CFramebuffer.Bind(oldFB);
		
		this.time += dT;
	}
	
	Display(){
		
		this.display_shader.Bind();
			this.txPressure.Bind(0, this.display_shader.ULTexturePressure);
			this.txVelocity.Bind(1, this.display_shader.ULTextureVelocity);
			this.txDivergence.Bind(2, this.display_shader.ULTextureDivergence);
			this.display_shader.setFloatUniform( this.display_shader.ULTime, this.time);
			this.display_shader.setFloatUniform( this.display_shader.ULdisplayBrightness, this.displayBrightness);
			this.display_shader.setFloatUniform( this.display_shader.ULdT, this.dt);
			this.display_shader.setFloat3Uniform( this.display_shader.ULaspect, this.aspect);
			this.display_shader.setFloatUniform( this.display_shader.ULk, this.kinematicViscosity);
				
			this.quad_model.RenderIndexedTriangles(this.display_shader);
	}

	CreateTest3DRenderShader(fragment_shader)
	{
		if(this.viscosity_shader == 'undefined' || this.viscosity_shader == null) return false;
		
		this.shader3DRender = new CShader(-1);//test_3d_texture_render "fluidsim_quad_surface_shader", "test_3d_texture_render"
		this.shader3DRender.addDefine("Resolution",this.str_vec3Res);
		this.shader3DRender.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.shader3DRender.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.shader3DRender.CompileFromFile(this.viscosity_shader.VertexShaderName, fragment_shader) == false) alert("nije kompajliran shader!");
		this.shader3DRender.InitDefaultAttribLocations();
		this.shader3DRender.InitDefaultUniformLocations();
		this.shader3DRender.ULz = this.shader3DRender.getUniformLocation("z");
		this.shader3DRender.ULdT = this.shader3DRender.getUniformLocation("dT");
		
		CShaderList.addShader(this.shader3DRender);
		
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
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.framebuffer.AttachTextureLayer(this.txVelocity0, l, z+l);
			this.framebuffer.CheckStatus();
			
			this.shader3DRender.setIntUniform(this.shader3DRender.ULz, z);			
			this.quad_model.RenderIndexedTriangles(this.shader3DRender);	
		}
		this.framebuffer.DetachAllTextures(); //potrebno je kod sljedecih poziva framebuffer.Bind() moze ostat bindane teksture na out
				
		CFramebuffer.Bind(oldFB);
	}
	
	//-----------------------------------------------------------------------------------------------------------
	// Mass advection
	//-----------------------------------------------------------------------------------------------------------
	
	CreateMass(w,h,d, bColorAndDensity, bFloat, init_mass_shader,advect_mass_shader,advect_correction_mass_shader)
	{
		d = Math.floor(d/this.NumOutBuffers)*this.NumOutBuffers;
		this.mass_width = w;
		this.mass_height = h;
		this.mass_depth = d;
		
		this.txMass0 = new CTexture3D(-1);
		this.txMass1 = new CTexture3D(-1);
		this.txMass2 = new CTexture3D(-1);
		
		this.fbMass0 = [];
		this.fbMass1 = [];
		this.fbMass2 = [];
		
		if(bColorAndDensity == true){
			if(bFloat == true){
				this.txMass0.CreateEmptyRGBAfloat32(this.mass_width, this.mass_height, this.mass_depth);
				this.txMass1.CreateEmptyRGBAfloat32(this.mass_width, this.mass_height, this.mass_depth);
				this.txMass2.CreateEmptyRGBAfloat32(this.mass_width, this.mass_height, this.mass_depth); }
			else{ 
				this.txMass0.CreateEmptyRGBAubyte(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass1.CreateEmptyRGBAubyte(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass2.CreateEmptyRGBAubyte(this.mass_width, this.mass_height, this.mass_depth); }
		}else{
			if(bFloat == true){
				this.txMass0.CreateEmptyRfloat32(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass1.CreateEmptyRfloat32(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass2.CreateEmptyRfloat32(this.mass_width, this.mass_height, this.mass_depth); }
			else{
				this.txMass0.CreateEmptyRubyte(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass1.CreateEmptyRubyte(this.mass_width, this.mass_height, this.mass_depth); 
				this.txMass2.CreateEmptyRubyte(this.mass_width, this.mass_height, this.mass_depth); }
		}
		
		this.txMass0.setMinMagFilterLinearLinear();
		this.txMass1.setMinMagFilterLinearLinear();
		this.txMass2.setMinMagFilterLinearLinear();
		this.txMass0.setWrapTypeClampToEdge();
		this.txMass1.setWrapTypeClampToEdge();
		this.txMass2.setWrapTypeClampToEdge();
		
		this.txMass = this.txMass0;
		this.txAdvectedMass = this.txMass1;
		
		this.str_mass_vec3Res = "vec3(" + this.mass_width.toString()+ ".0," + this.mass_height.toString() + ".0," + this.mass_depth.toString() + ".0)";
		this.str_mass_bHasColorComponent = (bColorAndDensity == true)? "1" : "0";
		this.bMassHasColorComponent = bColorAndDensity;
		
		var vertex_shader = this.viscosity_shader.VertexShaderName;
		
		this.mass_init_shader = new CShader(-1);
		this.mass_init_shader.addDefine("Resolution",this.str_vec3Res);
		this.mass_init_shader.addDefine("MassResolution",this.str_mass_vec3Res);
		this.mass_init_shader.addDefine("bHasColorComponent",this.str_mass_bHasColorComponent);
		this.mass_init_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.mass_init_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.mass_init_shader.CompileFromFile(vertex_shader, init_mass_shader) == false) alert("nije kompajliran shader!");
		this.mass_init_shader.InitDefaultAttribLocations();
		this.mass_init_shader.InitDefaultUniformLocations();
		this.mass_init_shader.ULaspect = -1;
		this.mass_init_shader.ULdT = -1;
		this.mass_init_shader.ULz = -1;
		this.mass_init_shader.ULdisplayBrightness = -1;
		this.mass_init_shader.ULTexturePressure = -1;
		this.mass_init_shader.ULTextureVelocity = -1;
		this.mass_init_shader.ULTextureDivergence = -1;
		this.mass_init_shader.ULaspect = this.mass_init_shader.getUniformLocation("aspect");
		this.mass_init_shader.ULdT = this.mass_init_shader.getUniformLocation("dT");
		this.mass_init_shader.ULz = this.mass_init_shader.getUniformLocation("z");
		// this.mass_init_shader.ULTextureMass = this.mass_init_shader.getUniformLocation("txMass");
		this.mass_init_shader.ULTextureNoiseRGB = this.mass_init_shader.getUniformLocation("txNoiseRGB");
		this.mass_init_shader.ULTextureVelocity = this.mass_init_shader.getUniformLocation("txVelocity");
		
		this.mass_advect_shader = new CShader(-1);
		this.mass_advect_shader.addDefine("Resolution",this.str_vec3Res);
		this.mass_advect_shader.addDefine("MassResolution",this.str_mass_vec3Res);
		this.mass_advect_shader.addDefine("bHasColorComponent",this.str_mass_bHasColorComponent);
		this.mass_advect_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.mass_advect_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.mass_advect_shader.CompileFromFile(vertex_shader, advect_mass_shader) == false) alert("nije kompajliran shader!");
		this.mass_advect_shader.InitDefaultAttribLocations();
		this.mass_advect_shader.InitDefaultUniformLocations();
		this.mass_advect_shader.ULaspect = -1;
		this.mass_advect_shader.ULdT = -1;
		this.mass_advect_shader.ULz = -1;
		this.mass_advect_shader.ULdisplayBrightness = -1;
		this.mass_advect_shader.ULTexturePressure = -1;
		this.mass_advect_shader.ULTextureVelocity = -1;
		this.mass_advect_shader.ULTextureDivergence = -1;
		this.mass_advect_shader.ULaspect = this.mass_advect_shader.getUniformLocation("aspect");
		this.mass_advect_shader.ULdT = this.mass_advect_shader.getUniformLocation("dT");
		this.mass_advect_shader.ULz = this.mass_advect_shader.getUniformLocation("z");
		this.mass_advect_shader.ULTextureMass = this.mass_advect_shader.getUniformLocation("txMass");
		this.mass_advect_shader.ULTextureVelocity = this.mass_advect_shader.getUniformLocation("txVelocity");
		
		this.mass_advect_correction_shader = new CShader(-1);
		this.mass_advect_correction_shader.addDefine("Resolution",this.str_vec3Res);
		this.mass_advect_correction_shader.addDefine("MassResolution",this.str_mass_vec3Res);
		this.mass_advect_correction_shader.addDefine("bHasColorComponent",this.str_mass_bHasColorComponent);
		this.mass_advect_correction_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		this.mass_advect_correction_shader.addDefine("WriteOutput(out_buffer, out_variable)", this.str_WriteOutBuffers);
		if(this.mass_advect_correction_shader.CompileFromFile(vertex_shader, advect_correction_mass_shader) == false) alert("nije kompajliran shader!");
		this.mass_advect_correction_shader.InitDefaultAttribLocations();
		this.mass_advect_correction_shader.InitDefaultUniformLocations();
		this.mass_advect_correction_shader.ULaspect = -1;
		this.mass_advect_correction_shader.ULdT = -1;
		this.mass_advect_correction_shader.ULz = -1;
		this.mass_advect_correction_shader.ULdisplayBrightness = -1;
		this.mass_advect_correction_shader.ULTexturePressure = -1;
		this.mass_advect_correction_shader.ULTextureVelocity = -1;
		this.mass_advect_correction_shader.ULTextureDivergence = -1;
		this.mass_advect_correction_shader.ULaspect = this.mass_advect_correction_shader.getUniformLocation("aspect");
		this.mass_advect_correction_shader.ULdT = this.mass_advect_correction_shader.getUniformLocation("dT");
		this.mass_advect_correction_shader.ULz = this.mass_advect_correction_shader.getUniformLocation("z");
		this.mass_advect_correction_shader.ULTextureMass = this.mass_advect_correction_shader.getUniformLocation("txMass");
		this.mass_advect_correction_shader.ULTextureAdvectedMass = this.mass_advect_correction_shader.getUniformLocation("txAdvectedMass");
		this.mass_advect_correction_shader.ULTextureVelocity = this.mass_advect_correction_shader.getUniformLocation("txVelocity");
		
		CShaderList.addShader(this.mass_init_shader);
		CShaderList.addShader(this.mass_advect_shader);
		CShaderList.addShader(this.mass_advect_correction_shader);
		CTextureList.addTexture(this.txMass0);
		CTextureList.addTexture(this.txMass1);
		CTextureList.addTexture(this.txMass2);
		
		//---------------------------------------------------------------------
		let fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbMass0[fb] = new CFramebuffer(false); this.fbMass0[fb].Create();
			this.fbMass0[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbMass0[fb].AttachTextureLayer(this.txMass0, l, z+l);
			this.fbMass0[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbMass1[fb] = new CFramebuffer(false); this.fbMass1[fb].Create();
			this.fbMass1[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbMass1[fb].AttachTextureLayer(this.txMass1, l, z+l);
			this.fbMass1[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		
		for(let z = 0; z < this.depth; z += this.NumOutBuffers)
		{
			this.fbMass2[fb] = new CFramebuffer(false); this.fbMass2[fb].Create();
			this.fbMass2[fb].bAutoSetupUsage = false;
			
			for(let l = 0; l < this.NumOutBuffers; ++l)
				this.fbMass2[fb].AttachTextureLayer(this.txMass2, l, z+l);
			this.fbMass2[fb].SetupUsage();
			++fb;
		}
		fb = 0;
		//---------------------------------------------------------------------
				
		this.ResetMass();
	}
	
	setNoiseTexture(noiseRGB){
		this.txNoiseRGB = noiseRGB;
	}
	
	ResetMass()
	{
		if(this.mass_init_shader == undefined || this.mass_init_shader == null) return;
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		gl.viewport(0, 0, this.mass_width, this.mass_height);
		
		this.mass_init_shader.Bind();
			this.txVelocity.Bind(0, this.mass_init_shader.ULTextureVelocity);
			this.txNoiseRGB.Bind(1, this.mass_init_shader.ULTextureNoiseRGB);
			this.mass_init_shader.setFloatUniform( this.mass_init_shader.ULdT, 0.0);
			this.mass_init_shader.setFloatUniform( this.mass_init_shader.ULTime, this.time);
			this.mass_init_shader.setFloat2Uniform( this.mass_init_shader.ULaspect, this.aspect);
			
			for(let z = 0; z < this.mass_depth; z += this.NumOutBuffers)
			{
				for(let l = 0; l < this.NumOutBuffers; ++l)
					this.framebuffer.AttachTextureLayer(this.txMass, l, z+l);
				this.framebuffer.SetupUsage();
				
				this.mass_init_shader.setIntUniform(this.mass_init_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.mass_init_shader);	
			}
		
		CFramebuffer.Bind(oldFB);
	}
	
	AdvectMass(dT)
	{
		if(this.mass_advect_shader == undefined || this.mass_advect_shader == null) return;
		
		var oldFB = gl.currentFramebuffer;
		this.framebuffer.Bind();
		gl.viewport(0, 0, this.mass_width, this.mass_height);
		
		this.txMass = this.txMass1;
		this.txOldMass = this.txMass0;
		this.fbMass = this.fbMass1;
		let fb = 0;
		
		this.mass_advect_shader.Bind();
			this.txOldMass.Bind(0, this.mass_advect_shader.ULTextureMass);
			this.txVelocity.Bind(1, this.mass_advect_shader.ULTextureVelocity);
			this.mass_advect_shader.setFloatUniform( this.mass_advect_shader.ULdT, dT);
			this.mass_advect_shader.setFloatUniform( this.mass_advect_shader.ULTime, this.time);
			this.mass_advect_shader.setFloat2Uniform( this.mass_advect_shader.ULaspect, this.aspect);
			
			for(let z = 0; z < this.mass_depth; z += this.NumOutBuffers)
			{
				if(this.bUseMultipleFramebuffers == true){
					this.fbMass[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txMass, l, z+l);
					this.framebuffer.SetupUsage();
				}
				this.mass_advect_shader.setIntUniform(this.mass_advect_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.mass_advect_shader);	
			}
			fb = 0;
		
		this.txAdvectedMass = this.txMass;
		this.txMass = this.txMass2;
		this.fbMass = this.fbMass2;
		
		this.mass_advect_correction_shader.Bind();
			this.txOldMass.Bind(0, this.mass_advect_correction_shader.ULTextureMass);
			this.txAdvectedMass.Bind(1, this.mass_advect_correction_shader.ULTextureAdvectedMass);
			this.txVelocity.Bind(2, this.mass_advect_correction_shader.ULTextureVelocity);
			this.mass_advect_correction_shader.setFloatUniform( this.mass_advect_correction_shader.ULdT, dT);
			this.mass_advect_correction_shader.setFloatUniform( this.mass_advect_correction_shader.ULTime, this.time);
			this.mass_advect_correction_shader.setFloat2Uniform( this.mass_advect_correction_shader.ULaspect, this.aspect);
			
			for(let z = 0; z < this.mass_depth; z += this.NumOutBuffers)
			{
				if(this.bUseMultipleFramebuffers == true){
					this.fbMass[fb].Bind(); ++fb;}
				else{
					for(let l = 0; l < this.NumOutBuffers; ++l)
						this.framebuffer.AttachTextureLayer(this.txMass, l, z+l);
					this.framebuffer.SetupUsage();
				}
				this.mass_advect_correction_shader.setIntUniform(this.mass_advect_correction_shader.ULz, z);
				this.quad_model.RenderIndexedTriangles(this.mass_advect_correction_shader);	
			}
			fb = 0;	
		
		
		CFramebuffer.Bind(oldFB);
		
		{
			let tmp = this.txMass2;
			this.txMass2 = this.txMass0;
			this.txMass0 = tmp;
			
			tmp = this.fbMass2;
			this.fbMass2 = this.fbMass0;
			this.fbMass0 = tmp;
		}
	}
	
	//-----------------------------------------------------------------------------------------------------------
	
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
		this.viscosity_shader.ULaspect = -1;
		this.viscosity_shader.ULdT = -1;
		this.viscosity_shader.ULk = -1;
		this.viscosity_shader.ULTextureVelocity = -1;
		this.viscosity_shader.ULz = -1;
		this.viscosity_shader.ULz = this.viscosity_shader.getUniformLocation("z");
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
		
		// this.advection_shader.addDefine("","");
		if(this.advection_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = -1;
		this.advection_shader.ULdT = -1;
		this.advection_shader.ULTextureVelocity = -1;
		this.advection_shader.ULz = -1;
		this.advection_shader.ULz = this.advection_shader.getUniformLocation("z");
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
		
		// this.advection_correction_shader.addDefine("","");
		if(this.advection_correction_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = -1;
		this.advection_correction_shader.ULdT = -1;
		this.advection_correction_shader.ULTextureVelocity = -1;
		this.advection_correction_shader.ULTextureAdvectedVelocity = -1;
		this.advection_correction_shader.ULz = -1;
		this.advection_correction_shader.ULz = this.advection_correction_shader.getUniformLocation("z");
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
		
		// this.divergence_shader.addDefine("","");
		if(this.divergence_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = -1;
		this.divergence_shader.ULdT = -1;
		this.divergence_shader.ULTexture = -1;
		this.divergence_shader.ULz = -1;
		this.divergence_shader.ULz = this.divergence_shader.getUniformLocation("z");
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
		
		// this.pressure_shader.addDefine("","");
		if(this.pressure_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = -1;
		this.pressure_shader.ULdT = -1;
		this.pressure_shader.ULTexturePressure = -1;
		this.pressure_shader.ULTextureDivergence = -1;
		this.pressure_shader.ULz = -1;
		this.pressure_shader.ULz = this.pressure_shader.getUniformLocation("z");
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
		
		// this.divfree_velocity_shader.addDefine("","");
		if(this.divfree_velocity_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = -1;
		this.divfree_velocity_shader.ULdT = -1;
		this.divfree_velocity_shader.ULTexturePressure = -1;
		this.divfree_velocity_shader.ULTextureVelocity = -1;
		this.divfree_velocity_shader.ULz = -1;
		this.divfree_velocity_shader.ULz = this.divfree_velocity_shader.getUniformLocation("z");
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
		
		this.display_shader.RemoveAllDefines();
		this.display_shader.addDefine(this.strDisplayType,"");
		this.display_shader.addDefine("Resolution",this.str_vec3Res);
		this.display_shader.addDefine("NUM_OUT_BUFFERS", this.NumOutBuffers.toString());
		if(this.display_shader.Recompile(false) == false) alert("nije kompajliran shader!");
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
		
		this.on_recompile_fluidsim_shaders();
	}
	
	RecompileMassShaders()
	{
		if(this.mass_init_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.mass_init_shader.InitDefaultAttribLocations();
		this.mass_init_shader.InitDefaultUniformLocations();
		this.mass_init_shader.ULaspect = -1;
		this.mass_init_shader.ULdT = -1;
		this.mass_init_shader.ULz = -1;
		this.mass_init_shader.ULdisplayBrightness = -1;
		this.mass_init_shader.ULTexturePressure = -1;
		this.mass_init_shader.ULTextureVelocity = -1;
		this.mass_init_shader.ULTextureDivergence = -1;
		this.mass_init_shader.ULaspect = this.mass_init_shader.getUniformLocation("aspect");
		this.mass_init_shader.ULdT = this.mass_init_shader.getUniformLocation("dT");
		this.mass_init_shader.ULz = this.mass_init_shader.getUniformLocation("z");
		this.mass_init_shader.ULTextureMass = this.mass_init_shader.getUniformLocation("txMass");
		this.mass_init_shader.ULTextureNoiseRGB = this.mass_init_shader.getUniformLocation("txNoiseRGB");
		this.mass_init_shader.ULTextureVelocity = this.mass_init_shader.getUniformLocation("txVelocity");
		
		if(this.mass_advect_shader.Recompile(false) == false) alert("nije kompajliran shader!");
		this.mass_advect_shader.InitDefaultAttribLocations();
		this.mass_advect_shader.InitDefaultUniformLocations();
		this.mass_advect_shader.ULaspect = -1;
		this.mass_advect_shader.ULdT = -1;
		this.mass_advect_shader.ULk = -1;
		this.mass_advect_shader.ULz = -1;
		this.mass_advect_shader.ULdisplayBrightness = -1;
		this.mass_advect_shader.ULTexturePressure = -1;
		this.mass_advect_shader.ULTextureVelocity = -1;
		this.mass_advect_shader.ULTextureDivergence = -1;
		this.mass_advect_shader.ULaspect = this.mass_advect_shader.getUniformLocation("aspect");
		this.mass_advect_shader.ULdT = this.mass_advect_shader.getUniformLocation("dT");
		this.mass_advect_shader.ULk = this.mass_advect_shader.getUniformLocation("k");
		this.mass_advect_shader.ULz = this.mass_advect_shader.getUniformLocation("z");
		this.mass_advect_shader.ULTextureMass = this.mass_advect_shader.getUniformLocation("txMass");
		this.mass_advect_shader.ULTextureVelocity = this.mass_advect_shader.getUniformLocation("txVelocity");
	}
}




