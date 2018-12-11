import { gl, WriteDebug } from "./glContext.js";
import { Shader, ShaderList } from "./glShader.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { Texture, TextureList } from "./glTexture.js";
import { Model, GenQuadModel } from "./glModel.js"

export class FluidSim2D
{
	constructor(w, h, vertex, viscosity, advection, advection_correction,
				divergence, pressure, divfree_velocity, display)
	{
		this.quad_model = new Model(-1);
		GenQuadModel(this.quad_model);
		
		this.width = w;
		this.height = h;
		
		this.viscosity_shader = new Shader(-1);
		this.viscosity_shader.addDefine("","");
		if(this.viscosity_shader.CompileFromFile(vertex, viscosity) == false) alert("nije kompajliran shader!");
		this.viscosity_shader.InitDefaultAttribLocations();
		this.viscosity_shader.InitDefaultUniformLocations();
		this.viscosity_shader.ULaspect = this.viscosity_shader.getUniformLocation("aspect");
		this.viscosity_shader.ULdT = this.viscosity_shader.getUniformLocation("dT");
		this.viscosity_shader.ULk = this.viscosity_shader.getUniformLocation("k");
		this.viscosity_shader.ULTextureVelocity = this.viscosity_shader.getUniformLocation("txVelocity");
				
		this.advection_shader = new Shader(-1);
		this.advection_shader.addDefine("","");
		if(this.advection_shader.CompileFromFile(vertex, advection) == false) alert("nije kompajliran shader!");
		this.advection_shader.InitDefaultAttribLocations();
		this.advection_shader.InitDefaultUniformLocations();
		this.advection_shader.ULaspect = this.advection_shader.getUniformLocation("aspect");
		this.advection_shader.ULdT = this.advection_shader.getUniformLocation("dT");
		this.advection_shader.ULTextureVelocity = this.advection_shader.getUniformLocation("txVelocity");
				
		this.advection_correction_shader = new Shader(-1);
		this.advection_correction_shader.addDefine("","");
		if(this.advection_correction_shader.CompileFromFile(vertex, advection_correction) == false) alert("nije kompajliran shader!");
		this.advection_correction_shader.InitDefaultAttribLocations();
		this.advection_correction_shader.InitDefaultUniformLocations();
		this.advection_correction_shader.ULaspect = this.advection_correction_shader.getUniformLocation("aspect");
		this.advection_correction_shader.ULdT = this.advection_correction_shader.getUniformLocation("dT");
		this.advection_correction_shader.ULTextureVelocity = this.advection_correction_shader.getUniformLocation("txVelocity");
		this.advection_correction_shader.ULTextureAdvectedVelocity = this.advection_correction_shader.getUniformLocation("txAdvectedVelocity");
				
		this.divergence_shader = new Shader(-1);
		this.divergence_shader.addDefine("","");
		if(this.divergence_shader.CompileFromFile(vertex, divergence) == false) alert("nije kompajliran shader!");
		this.divergence_shader.InitDefaultAttribLocations();
		this.divergence_shader.InitDefaultUniformLocations();
		this.divergence_shader.ULaspect = this.divergence_shader.getUniformLocation("aspect");
		this.divergence_shader.ULdT = this.divergence_shader.getUniformLocation("dT");
		this.divergence_shader.ULTexture = this.divergence_shader.getUniformLocation("txTexture");
				
		this.pressure_shader = new Shader(-1);
		this.pressure_shader.addDefine("","");
		if(this.pressure_shader.CompileFromFile(vertex, pressure) == false) alert("nije kompajliran shader!");
		this.pressure_shader.InitDefaultAttribLocations();
		this.pressure_shader.InitDefaultUniformLocations();
		this.pressure_shader.ULaspect = this.pressure_shader.getUniformLocation("aspect");
		this.pressure_shader.ULdT = this.pressure_shader.getUniformLocation("dT");
		this.pressure_shader.ULTexturePressure = this.pressure_shader.getUniformLocation("txPressure");
		this.pressure_shader.ULTextureDivergence = this.pressure_shader.getUniformLocation("txDivergence");
				
		this.divfree_velocity_shader = new Shader(-1);
		this.divfree_velocity_shader.addDefine("","");
		if(this.divfree_velocity_shader.CompileFromFile(vertex, divfree_velocity) == false) alert("nije kompajliran shader!");
		this.divfree_velocity_shader.InitDefaultAttribLocations();
		this.divfree_velocity_shader.InitDefaultUniformLocations();
		this.divfree_velocity_shader.ULaspect = this.divfree_velocity_shader.getUniformLocation("aspect");
		this.divfree_velocity_shader.ULdT = this.divfree_velocity_shader.getUniformLocation("dT");
		this.divfree_velocity_shader.ULTexturePressure = this.divfree_velocity_shader.getUniformLocation("txPressure");
		this.divfree_velocity_shader.ULTextureVelocity = this.divfree_velocity_shader.getUniformLocation("txVelocity");
				
		this.display_shader = new Shader(-1);
		this.display_shader.addDefine("","");
		if(this.display_shader.CompileFromFile(vertex, display) == false) alert("nije kompajliran shader!");
		this.display_shader.InitDefaultAttribLocations();
		this.display_shader.InitDefaultUniformLocations();
		this.display_shader.ULaspect = this.display_shader.getUniformLocation("aspect");
		this.display_shader.ULdT = this.display_shader.getUniformLocation("dT");
		this.display_shader.ULk = this.display_shader.getUniformLocation("k");
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
		
		this.txVelocity0 = new Texture(-1); txVelocity0.CreateEmptyRGBfloat32(this.width, this.height);
		this.txVelocity1 = new Texture(-1); txVelocity1.CreateEmptyRGBfloat32(this.width, this.height);
		this.txVelocity2 = new Texture(-1); txVelocity2.CreateEmptyRGBfloat32(this.width, this.height);
		
		//ovo swappa 
		this.txDivergentVelocity = this.txVelocity0;
		this.txAdvectedVelocity = this.txVelocity1;
		this.txVelocity = this.txVelocity2;
		
		//ovo mozda optimizirat i strpat ove tri teksture kao komponente txAdvectedVelocity (ili one koja se ne koristi)?
		this.txDivergence = new Texture(-1); txDivergence.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure0 = new Texture(-1); txPressure0.CreateEmptyRfloat32(this.width, this.height);
		this.txPressure1 = new Texture(-1); txPressure1.CreateEmptyRfloat32(this.width, this.height);
				
	}
	
	
}





















