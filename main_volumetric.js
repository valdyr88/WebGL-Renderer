import * as glext from "./GLExt/GLExt.js"
import * as sys from "./System/sys.js"
import * as vMath from "../glMatrix/gl-matrix.js";
import * as sim from "./GLExt/fluidsim.js"

var gl = null;

var bUseHDR = false;
var bStoreHDRinRGBA8 = true;
var bAutoQualitySelect = false;
var QualitySelect = 0;
var strQualitySelect = ["Quality_Low", "Quality_Med", "Quality_High"];
var gFluidSim = null;
var b3DFluidSim = true;
var bFluidSimPass = true;

export function main(){
	
	var gs = sys.storage.GlobalStorage.getSingleton();
	sys.mouse.InitMouse(document);
	sys.keyboard.InitKeyboard(document);
	sys.CheckWhatBrowser();
		
	gl = glext.glInit("glcanvas");
	if(gl == null) return;
	
		 if(gl.isWGL2 == false && glext.glEnableExtension('OES_texture_float') == false) alert("no extension: OES_texture_float");
		 if(gl.isWGL2 == false && glext.glEnableExtension('EXT_shader_texture_lod') == false) alert("no extension: EXT_shader_texture_lod");
		 if(glext.glEnableExtension('EXT_color_buffer_float') == false) alert("no extension: EXT_color_buffer_float");
		 if(glext.glEnableExtension('OES_texture_float_linear') == false) alert("no extension: OES_texture_float_linear");
		
	glext.InitDebugTextDOM("debug_text");
	var debug_kvadrat = document.getElementById("debug_kvadrat");
	
	var bMouseOverCanvas = false;
	gl.canvasObject.onmouseover = function(){ bMouseOverCanvas = true; }
	gl.canvasObject.onmouseout = function(){
		/* let mpos = sys.mouse.get().getPosition();
		
		if(mpos[0] > this.offsetLeft && mpos[0] < this.offsetLeft + this.offsetWidth &&
		   mpos[1] > this.offsetTop && mpos[1] < this.offsetTop + this.offsetHeight){
			return;
		} */
		
		bMouseOverCanvas = false;
	}
	
	// gl.canvasObject.addEventListener("mouseenter", function(){ bMouseOverCanvas = true; });
	// gl.canvasObject.addEventListener("mouseleave", function(){ bMouseOverCanvas = false; });
	
	gl.clearColor(0.0, 1.0, 1.0, 1.0);
	gl.blendColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.clearDepth(1.0); 
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	gl.disable(gl.BLEND);
	gl.depthFunc(gl.LESS);
	
	glext.BlendMode.Init();
	
	if(bUseHDR == true && bStoreHDRinRGBA8 == true)
		glext.ShaderDefines.addGlobalDefine("USE_HDR_RGBA8","");
	else if(bUseHDR == true)
		glext.ShaderDefines.addGlobalDefine("USE_HDR","");
	
	glext.ShaderDefines.addGlobalDefine("MAX_LIGHTS", " "+glext.MAX_LIGHTS);
	
	var simple_shader = new glext.Shader(0);
	if(simple_shader.CompileFromFile("simpleVS", "simpleFS") == false) alert("nije kompajliran shader!");
	simple_shader.setVertexAttribLocations("aVertexPosition","aVertexNormal","aVertexTangent",null,"aTexCoords");
	simple_shader.setTransformMatricesUniformLocation("ModelMatrix","ViewMatrix","ProjectionMatrix");
	simple_shader.setDefaultTextureUniformLocations("txDiffuse","txNormal","txAoRS");
	// simple_shader.setBRDFLUTTextureUniformLocation("txBRDF");
	simple_shader.setFlagsUniformLocation("uFlags");
	simple_shader.setTimeUniformLocation("Time");
	simple_shader.setCameraPositionUniformLocation("CameraPosition");
	simple_shader.ULTextureAmb = simple_shader.getUniformLocation("txAmbient");
	
	var skybox_shader = new glext.Shader(1);
	if(skybox_shader.CompileFromFile("simpleVS", "deferred_skybox") == false) alert("nije kompajliran shader!");
	skybox_shader.ULTextureAmb = skybox_shader.getUniformLocation("txAmbient");
	skybox_shader.InitDefaultUniformLocations();
	skybox_shader.InitDefaultAttribLocations();
	
	var deferred_opaque_shade = new glext.Shader(2);
	if(deferred_opaque_shade.CompileFromFile("simpleVS", "deferred_opaque_shade") == false) alert("nije kompajliran shader!");
	deferred_opaque_shade.InitDefaultAttribLocations();
	deferred_opaque_shade.InitDefaultUniformLocations();
	deferred_opaque_shade.ULInvViewProjMatrix = deferred_opaque_shade.getUniformLocation("InverseViewProjectionMatrix");
	
	var transparent_shader = new glext.Shader(3);
	if(transparent_shader.CompileFromFile("simpleVS", "transparent_shader") == false) alert("nije kompajliran shader!");
	transparent_shader.InitDefaultAttribLocations();
	transparent_shader.InitDefaultUniformLocations();
	transparent_shader.ULTextureAmb = transparent_shader.getUniformLocation("txAmbient");
	transparent_shader.ULTextureBackground = transparent_shader.getUniformLocation("txBackground");
	
	var backbuffer_shader = new glext.Shader(4);
	if(backbuffer_shader.CompileFromFile("simpleVS", "backbuffer_shader") == false) alert("nije kompajliran shader!");
	backbuffer_shader.InitDefaultAttribLocations();
	backbuffer_shader.InitDefaultUniformLocations();
	
	var atmosphere_shader = new glext.Shader(5);
	if(atmosphere_shader.CompileFromFile("simpleVS", "atmosphere_shader") == false) alert("nije kompajliran shader!");
	atmosphere_shader.InitDefaultAttribLocations();
	atmosphere_shader.InitDefaultUniformLocations();
	
	var volume_clouds_shader = new glext.Shader(6);
	volume_clouds_shader.addDefine(strQualitySelect[QualitySelect],"");//"Quality_Low"
	if(volume_clouds_shader.CompileFromFile("volume_clouds_vs", "volume_clouds_shader") == false) alert("nije kompajliran shader!");
	volume_clouds_shader.InitDefaultAttribLocations();
	volume_clouds_shader.InitDefaultUniformLocations();
	volume_clouds_shader.ULTextureNoiseRGB = volume_clouds_shader.getUniformLocation("txNoiseRGB");
	volume_clouds_shader.ULTextureBackground = volume_clouds_shader.getUniformLocation("txBackground");
	volume_clouds_shader.ULTextureBackgroundDepth = volume_clouds_shader.getUniformLocation("txDepth");
	// volume_clouds_shader.ULInverseViewMatrix = volume_clouds_shader.getUniformLocation("InverseViewMatrix");
	volume_clouds_shader.ULCameraForward = volume_clouds_shader.getUniformLocation("CameraForward");
	volume_clouds_shader.ULCameraRight = volume_clouds_shader.getUniformLocation("CameraRight");
	volume_clouds_shader.ULCameraUp = volume_clouds_shader.getUniformLocation("CameraUp");
	volume_clouds_shader.ULMouse = volume_clouds_shader.getUniformLocation("Mouse");
	volume_clouds_shader.ULResolution = volume_clouds_shader.getUniformLocation("Resolution");
	volume_clouds_shader.ULPixelAspect = volume_clouds_shader.getUniformLocation("PixelAspect");
	volume_clouds_shader.ULTextureMass = volume_clouds_shader.getUniformLocation("txFluidSimCloud");
	volume_clouds_shader.ULTextureVelocity = volume_clouds_shader.getUniformLocation("txFluidSimVelocity");
	volume_clouds_shader.ULTexturePressure = volume_clouds_shader.getUniformLocation("txFluidSimPressure");
	volume_clouds_shader.ULTextureDivergence = volume_clouds_shader.getUniformLocation("txFluidSimDivergence");
	volume_clouds_shader.ULDisplayBrightness = volume_clouds_shader.getUniformLocation("displayBrightness");
	volume_clouds_shader.ULTanHalfFOV = volume_clouds_shader.getUniformLocation("TanHalfFOV");
		
	var sphere_model = new glext.Model(1);
	sphere_model.ImportFrom("SphereModel");
	
	var navigatorModel = new glext.Model(2);
	navigatorModel.ImportFrom("navigatorModel");
	
	var quad_model = new glext.Model(2);
	glext.GenQuadModel(quad_model);
	
	var txBRDF_LUT = new glext.Texture(3); txBRDF_LUT.CreateFromFile("txBRDF_LUT");
	txBRDF_LUT.setWrapTypeClampToEdge();
	
	var txD = new glext.Texture(0); txD.CreateFromFile("txRock_D");
	var txN = new glext.Texture(1); txN.CreateFromFile("txRock_N");
	var txAoRS = new glext.Texture(2); txAoRS.CreateFromFile("txRock_AoRS");
	
	var txGlassAoRS = new glext.Texture(-1); txGlassAoRS.CreateFromFile("txGlass_AoRS");
	var txGlassN = new glext.Texture(-1); txGlassN.CreateFromFile("txGlass_N");
	
	var txAtmosphere = new glext.Texture(-1); txAtmosphere.CreateFromFile("txAtmosphere");
	
	var txNoiseRGB = new glext.Texture(-1); txNoiseRGB.CreateFromFile("txNoiseRGB");
	txNoiseRGB.setWrapTypeRepeat();
	
	// var txAmb = new glext.TextureCube(0); txAmb.CreateFromDOMDataElements("tx128");	
			
	var light = new glext.Light(0);
	// var lightUniforms = glext.Light.getUniformLocationsFromShader(shader,"light0");
	// var lightUniforms_backbuffer_shader = glext.Light.getUniformLocationsFromShader(deferred_opaque_shade,"light0");
	// atmosphere_shader.lightUniforms = glext.Light.getUniformLocationsFromShader(atmosphere_shader, "light0");
	// light.AttachUniformBlockTo(shader);	
	
	var projectionMatrix = vMath.mat4.create();
	var viewMatrix = vMath.mat4.create();
	
	var orbital = [];
	orbital.radius = 3.0;
	orbital.inclination = 0.0;
	orbital.azimuth = 0.0;
	orbital.dinclination = 0.0;
	orbital.dazimuth = 0.0;
	
	var startViewDir = [0.5,0.0,0.25];
	vMath.vec3.normalize(startViewDir, startViewDir);
	vMath.vec3.scale(startViewDir, startViewDir, orbital.radius);
	
	var eyePt = vMath.vec3.fromValues(startViewDir[0],startViewDir[1],startViewDir[2]);
	var centerPt = vMath.vec3.fromValues(0.0,0.0,0.0);
	var upDir = vMath.vec3.fromValues(0.0,0.0,-1.0);
	
	var Camera = new glext.Camera(0, gl.viewportWidth, gl.viewportHeight);
	Camera.setPositionAndDir(eyePt, [1.0,0.0,0.0], upDir);
	Camera.UpdateProjectionMatrix();
	
	//framebuffer
	//------------------------------------------------------------------------
	var fbo_width = gl.viewportWidth; var fbo_height = gl.viewportHeight;
	var txfbColor = new glext.Texture(4); txfbColor.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var txfbDepth = new glext.Texture(5); txfbDepth.CreateEmptyDepthfloat(fbo_width, fbo_height);
	var txfbNormal= new glext.Texture(6); txfbNormal.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var txfbAoRSMt= new glext.Texture(7); txfbAoRSMt.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var fbo = new glext.Framebuffer(true);   fbo.Create(); 
	fbo.AttachTexture(txfbColor, 0);
	fbo.AttachTexture(txfbNormal,1);
	fbo.AttachTexture(txfbAoRSMt,2);
	fbo.AttachDepth(txfbDepth);
	fbo.CheckStatus();
	
	var fboHdrMipBlur = new glext.Framebuffer(true); fboHdrMipBlur.Create(); fboHdrMipBlur.Bind();
	var txfbHdrMipBlur = new glext.Texture(8); txfbHdrMipBlur.CreateEmptyWithMipsRGBAubyte(fbo_width, fbo_height);
	fboHdrMipBlur.AttachTexture(txfbHdrMipBlur, 0);
	fboHdrMipBlur.AttachDepth(txfbDepth);
	fboHdrMipBlur.CheckStatus();
	
	glext.Framebuffer.BindMainFB();	
	//------------------------------------------------------------------------
		glext.LightList.addLight(light);
		
		glext.TextureList.addTexture(txD);
		glext.TextureList.addTexture(txN);
		glext.TextureList.addTexture(txAoRS);
		glext.TextureList.addTexture(txGlassN);
		glext.TextureList.addTexture(txGlassAoRS);
		glext.TextureList.addTexture(txBRDF_LUT);
		// glext.TextureList.addTexture(txAmb);
		glext.TextureList.addTexture(txfbColor);
		glext.TextureList.addTexture(txfbNormal);
		glext.TextureList.addTexture(txfbAoRSMt);
		glext.TextureList.addTexture(txfbDepth);
		glext.TextureList.addTexture(txfbHdrMipBlur);
		glext.TextureList.addTexture(txAtmosphere);
		glext.TextureList.addTexture(txNoiseRGB);
		
		glext.ShaderList.addShader(simple_shader);
		glext.ShaderList.addShader(skybox_shader);
		glext.ShaderList.addShader(deferred_opaque_shade);
		glext.ShaderList.addShader(transparent_shader);
		glext.ShaderList.addShader(backbuffer_shader);
		glext.ShaderList.addShader(atmosphere_shader);
		glext.ShaderList.addShader(volume_clouds_shader);
		
		sphere_model.setTexture(txD,"txDiffuse");
		sphere_model.setTexture(txN,"txNormal");
		sphere_model.setTexture(txAoRS,"txAoRS");
		// sphere_model.setTexture(txAmb,"txAmbient");
		sphere_model.setShader(simple_shader);
		
		navigatorModel.setTexture(txGlassN,"txNormal");
		navigatorModel.setTexture(txGlassAoRS,"txAoRS");
		navigatorModel.setTexture(txfbDepth,"txDepth");
		navigatorModel.setTexture(txBRDF_LUT,"txBRDF");
		// navigatorModel.setTexture(txAmb,"txAmbient");
		navigatorModel.setTexture(txfbHdrMipBlur,"txBackground");
		navigatorModel.setShader(transparent_shader);
		
		quad_model.setTexture(txfbColor,"txDiffuse");
		quad_model.setTexture(txfbNormal,"txNormal");
		quad_model.setTexture(txfbAoRSMt,"txAoRS");
		// quad_model.setTexture(txfbDepth,"txDepth");
		quad_model.setTexture(txBRDF_LUT,"txBRDF");
		// quad_model.setTexture(txAmb,"txAmbient");
		quad_model.setShader(deferred_opaque_shade);
		
		light.AttachUniformBlockTo(deferred_opaque_shade);	
		light.AttachUniformBlockTo(transparent_shader);	
		light.AttachUniformBlockTo(atmosphere_shader);
		light.AttachUniformBlockTo(volume_clouds_shader);
		light.AttachUniformBlockTo(simple_shader);
		
	txfbHdrMipBlur.setMinMagFilterLinearMipMapLinear();
	//------------------------------------------------------------------------
	
	var fluidSim = null;
	
	if(b3DFluidSim == false){
		fluidSim = new sim.FluidSim2D(200,200,
			/* vertex, viscosity, advection, advection_correction,
					divergence, pressure, divfree_velocity, display */
			"fluidsim_quad_surface_shader", "fluidsim_viscosity_shader", "fluidsim_advection_shader", "fluidsim_advection_correction_shader",
			"fluidsim_divergence_shader", "fluidsim_pressure_shader", "fluidsim_divfree_velocity_shader", "fluidsim_display_shader"
			);
	}
	else{
		fluidSim = new sim.FluidSim3D(128,128,128,
			/* vertex, viscosity, advection, advection_correction,
					divergence, pressure, divfree_velocity, display */
			"fluidsim_quad_surface_shader", "fluidsim_viscosity_shader", "fluidsim_advection_shader", "fluidsim_advection_correction_shader",
			"fluidsim_divergence_shader", "fluidsim_pressure_shader", "fluidsim_divfree_velocity_shader", "fluidsim_display_shader"
			);
	}
	fluidSim.setKinematicViscosity(1.0);
	fluidSim.setDisplayType("_DEBUG_Display_Velocity");
	fluidSim.ClearBuffers();
	
	gFluidSim = fluidSim;
	
	var fluidsimBrightnessSlider = document.getElementById("fluidsim_brightness_slider");
	fluidsimBrightnessSlider.fvalue = function(){
		var v = this.value; //1, 100
		v = v - 50.0; //-49, 50
		v = v / 5.0; //5: -9.8, 10.0 //10: -4.9, 5.0
		v = Math.pow(2.0, v); //5: 0.0011, 1024 //10: 0.0335, 32.0
		return v;
	}
	var fluidsimPressureIterationCountSlider = document.getElementById("fluidsim_pressure_iteration_count_slider");
	var fluidsimViscositySlider = document.getElementById("fluidsim_viscosity_slider");
	fluidsimViscositySlider.fvalue = function(){
		var v = this.value; //0, 90
		v = v / 30.0; //0.0, 3.0
		return v;
	}
	
	var barrier = null;
	
	if(b3DFluidSim == true)
	{
		fluidSim.CreateTest3DRenderShader("test_3d_texture_render");
		fluidSim.setNoiseTexture(txNoiseRGB);
		fluidSim.CreateMass(128,128,128, false, false, "fluidsim_mass_init_shader", "fluidsim_mass_advect_shader", "fluidsim_mass_advect_correction_shader");
				
		//custom barrier
		//-----------------------------------------------------------------------------------------------
		fluidSim.viscosity_shader.ULSphereBarrier = fluidSim.viscosity_shader.getUniformLocation("sphereBarrier");
		fluidSim.viscosity_shader.ULSphereBarrierVelocity = fluidSim.viscosity_shader.getUniformLocation("sphereBarrierVelocity");
		fluidSim.pressure_shader.ULSphereBarrier = fluidSim.pressure_shader.getUniformLocation("sphereBarrier");
		fluidSim.pressure_shader.ULSphereBarrierVelocity = fluidSim.pressure_shader.getUniformLocation("sphereBarrierVelocity");
		
		fluidSim.SphereBarrier = ["Sphere Barrier"];
		fluidSim.SphereBarrier.position = [0.25,0.0,0.5];
		fluidSim.SphereBarrier.radius = 0.05;
		fluidSim.SphereBarrier.velocity = [0.0,0.0,0.0];
		fluidSim.SphereBarrier.ToRealWorldScale = 2.0;
		fluidSim.SphereBarrier.gravity_dir = [upDir[0],upDir[1],upDir[2]];
		fluidSim.SphereBarrier.up_dir = [-upDir[0],-upDir[1],-upDir[2]];
		fluidSim.SphereBarrier.down_dir = [upDir[0],upDir[1],upDir[2]];
		fluidSim.SphereBarrier.right_dir = [Camera.RightDir[0], Camera.RightDir[1], Camera.RightDir[2]];
		fluidSim.SphereBarrier.left_dir = [-Camera.RightDir[0], -Camera.RightDir[1], -Camera.RightDir[2]];
		fluidSim.SphereBarrier.forward_dir = [Camera.ForwardDir[0], Camera.ForwardDir[1], Camera.ForwardDir[2]];
		fluidSim.SphereBarrier.back_dir = [-Camera.ForwardDir[0], -Camera.ForwardDir[1], -Camera.ForwardDir[2]];
		fluidSim.SphereBarrier.floor_depth = 1.0;
		fluidSim.SphereBarrier.ceiling_height = 1.0;
		fluidSim.SphereBarrier.walls_dist = 1.0;
		fluidSim.SphereBarrier.g = 0.981;
		fluidSim.SphereBarrier.restitution = 0.5;
		fluidSim.SphereBarrier.velScale = 0.25;
		fluidSim.SphereBarrier.mass = 0.25;
		fluidSim.SphereBarrier.k_spring = 1.0;
		fluidSim.SphereBarrier.max_velocity = 10.0;
		fluidSim.SphereBarrier.min_velocity = 0.1;
		fluidSim.SphereBarrier.drag = 0.25;
		fluidSim.SphereBarrier.goal_position = [0.0,0.0,0.0];
		fluidSim.SphereBarrier.goal_position2D = [0.0,0.0];
		fluidSim.SphereBarrier.position2D = [0.0,0.0];
		fluidSim.SphereBarrier.bUpdateTowadsGoal = false;
		fluidSim.SphereBarrier.Camera = Camera;
		
		fluidSim.SphereBarrier.getPositionAndRadius = function(){ return [this.position[0]*0.5+0.5, this.position[1]*0.5+0.5, this.position[2]*0.5+0.5, this.radius]; }
		fluidSim.SphereBarrier.getVelocity = function(){ return [ this.velScale*this.velocity[0], this.velScale*this.velocity[1], this.velScale*this.velocity[2]]; }
		fluidSim.SphereBarrier.getWorldPosition = function(){ return [this.position[0]*this.ToRealWorldScale, this.position[1]*this.ToRealWorldScale, this.position[2]*this.ToRealWorldScale]; }
		
		fluidSim.pre_viscosity_pass_function = function(){
			this.viscosity_shader.setFloat4Uniform( this.viscosity_shader.ULSphereBarrier, this.SphereBarrier.getPositionAndRadius() );
			this.viscosity_shader.setFloat3Uniform( this.viscosity_shader.ULSphereBarrierVelocity, this.SphereBarrier.getVelocity() );
		}
		fluidSim.pre_pressure_pass_function = function(){
			this.pressure_shader.setFloat4Uniform( this.pressure_shader.ULSphereBarrier, this.SphereBarrier.getPositionAndRadius() );
			this.pressure_shader.setFloat3Uniform( this.pressure_shader.ULSphereBarrierVelocity, this.SphereBarrier.getVelocity() );
		}
		fluidSim.on_recompile_fluidsim_shaders = function(){
			this.viscosity_shader.ULSphereBarrier = this.viscosity_shader.getUniformLocation("sphereBarrier");
			this.viscosity_shader.ULSphereBarrierVelocity = this.viscosity_shader.getUniformLocation("sphereBarrierVelocity");
			this.pressure_shader.ULSphereBarrier = this.pressure_shader.getUniformLocation("sphereBarrier");
			this.pressure_shader.ULSphereBarrierVelocity = this.pressure_shader.getUniformLocation("sphereBarrierVelocity");
		}
		
		//TransformToScreenCoordinates(): pos je 3D pozicija u fluidSim lokalnom prostoru
		fluidSim.SphereBarrier.TransformToScreenCoordinates = function(pos, Camera){
			let pos3D = [0.0,0.0,0.0]; vMath.vec3.copy(pos3D, pos); var pos2D = [0.0,0.0];
			
			vMath.vec3.scale(pos3D, pos, this.ToRealWorldScale);
			vMath.vec3.subtract(pos3D, pos3D, Camera.Position);
			
			pos2D[0] = vMath.vec3.dot(pos3D, Camera.RightDir);
			pos2D[1] = vMath.vec3.dot(pos3D, Camera.UpDir)*Camera.PixelAspect;
			
			let dist = vMath.vec3.dot(pos3D, Camera.ForwardDir); 
			
			vMath.vec2.scale(pos2D, pos2D, 1.0/dist);
			
			vMath.vec2.add(pos2D, pos2D, [1.0,1.0]);
			vMath.vec2.scale(pos2D, pos2D, 0.5);
			
			vMath.vec2.multiply(pos2D, pos2D, [Camera.Width, Camera.Height]);
			
			return pos2D;
		}
		//TransformFromScreenCoordinates(): pos je 2D pozicija na screenu u screen-space prostoru
		fluidSim.SphereBarrier.TransformFromScreenCoordinates = function(pos, Camera, bNaRavniniKojaSadrziPosition){
			let pos2D = [0.0,0.0]; vMath.vec2.copy(pos2D, pos); var pos3D = [0.0,0.0,0.0]; let v2 = [0.0,0.0,0.0];
			
			vMath.vec2.multiply(pos2D, pos2D, [1.0/Camera.Width, 1.0/Camera.Height]);
			vMath.vec2.scale(pos2D, pos2D, 2.0);
			vMath.vec2.subtract(pos2D, pos2D, [1.0,1.0]);
						
			vMath.vec3.scale(pos3D, Camera.RightDir, pos2D[0]);
			vMath.vec3.scale(v2, Camera.UpDir, pos2D[1]);
			vMath.vec3.add(pos3D, pos3D, v2);
			
			vMath.vec3.scale(v2, this.position, this.ToRealWorldScale);
			vMath.vec3.subtract(v2, v2, Camera.Position);
			let dist = vMath.vec3.dot(v2, Camera.ForwardDir); //testirat
			
			vMath.vec3.scale(pos3D, pos3D, dist);
			
			if(bNaRavniniKojaSadrziPosition == true){
				vMath.vec3.scale(v2, Camera.ForwardDir, dist);
				vMath.vec3.add(pos3D, pos3D, v2);
			}
			
			vMath.vec3.scale(pos3D, pos3D, 1.0/this.ToRealWorldScale);
			
			return pos3D;
		}
		
		fluidSim.SphereBarrier.getPositionOnScreen = function(Camera){
			this.position2D = this.TransformToScreenCoordinates(this.position, Camera);
			return this.position2D;
		}
		fluidSim.SphereBarrier.setGoalPosition2D = function(pos2D, Camera){
			this.goal_position = this.TransformFromScreenCoordinates(pos2D, Camera, true);
			vMath.vec2.copy(this.goal_position2D, pos2D);
		}
		
		fluidSim.SphereBarrier.getDistanceToCamera = function(Camera){
			let pos3D = [0.0,0.0,0.0];
			
			vMath.vec3.scale(pos3D, this.position, this.ToRealWorldScale);
			vMath.vec3.subtract(pos3D, pos3D, Camera.Position);
			
			let dist = vMath.vec3.dot(pos3D, Camera.ForwardDir);
			
			return dist;
		}
		
		fluidSim.SphereBarrier.ReflectVector = function(out, vector, normal, restitution){
			if(restitution == undefined) restitution = 1.0;
			let d = vMath.vec3.dot(vector, normal);
			let v2 = [0.0,0.0,0.0]; 
			vMath.vec3.scale(v2, normal, -d);
			vMath.vec3.add(out, vector, v2);
			vMath.vec3.scale(v2, normal, -d*restitution);
			vMath.vec3.add(out, out, v2);
			return out;
		}
		//--------------------------------------------------------------
		
		fluidSim.SphereBarrier.UpdateMovementTowardsGoal = function(dt){
			if(this.bUpdateTowadsGoal == false) return;
			
			let n = [0.0,0.0,0.0]; vMath.vec3.subtract(n, this.goal_position, this.position);
			let d = vMath.vec3.length(n);
			if(d < 0.01){ return; }
			
			vMath.vec3.scale(n, n, 1.0/d);
			
			let F = [0.0,0.0,0.0]; vMath.vec3.scale(F, n, d*this.k_spring);
			let a = [0.0,0.0,0.0]; vMath.vec3.scale(a, F, 1.0/this.mass);
			
			let dv = [0.0,0.0,0.0]; vMath.vec3.scale(dv, a, dt);
			vMath.vec3.add(this.velocity, this.velocity, dv);	
		}
		fluidSim.SphereBarrier.UpdateMovementTowardsGoal2D = function(dt){
			if(this.bUpdateTowadsGoal == false) return;
			
			//koordinate su u Screen space ([0,0] - [Camera.Width, Camera.Height])
			let n = [0.0,0.0]; vMath.vec2.subtract(n, this.goal_position2D, this.position2D);
			let d = vMath.vec2.length(n);
			if(d < 0.1){ return; }
			
			vMath.vec2.scale(n, n, 1.0/d);
			
			let F = [0.0,0.0]; vMath.vec2.scale(F, n, d*this.k_spring);
			let a = [0.0,0.0]; vMath.vec2.scale(a, F, 1.0/this.mass);
			
			let dv = [0.0,0.0]; vMath.vec2.scale(dv, a, dt);
			
			vMath.vec2.add(dv, dv, [0.5*this.Camera.Width, 0.5*this.Camera.Height]);
			let dv3D = this.TransformFromScreenCoordinates(dv, this.Camera, false);
			
			vMath.vec3.add(this.velocity, this.velocity, dv3D);
		}
				
		fluidSim.SphereBarrier.UpdateDrag = function(dt){
			if(this.bUpdateTowadsGoal == true) return;
			//ovo je bezveze funcija koja usporava barrier kuglu.
			vMath.vec3.scale(this.velocity, this.velocity, 1.0 - this.drag*dt);
		}
		fluidSim.SphereBarrier.UpdateGravity = function(dt){
			if(this.bUpdateTowadsGoal == true) return;
			
			let dv = [0.0,0.0,0.0];
			vMath.vec3.scale(dv, this.gravity_dir, dt*this.g);
			vMath.vec3.add(this.velocity, this.velocity, dv);
		}
		fluidSim.SphereBarrier.BounceOfWalls = function(dt){
			
			let projected_position = [0.0,0.0,0.0];
			vMath.vec3.scale(projected_position, this.velocity, dt);
			vMath.vec3.add(projected_position, this.position, projected_position);
			
			let h = vMath.vec3.dot(projected_position, this.down_dir);
			if(h >= this.floor_depth-1.5*this.radius){
				let d = vMath.vec3.length(this.velocity);
				if(d > this.min_velocity)
					this.ReflectVector(this.velocity, this.velocity, this.down_dir, this.restitution);
				else
					vMath.vec3.copy(this.velocity, [0,0,0]);
			}
			h = vMath.vec3.dot(projected_position, this.up_dir);
			if(h >= this.ceiling_height-1.5*this.radius){
				this.ReflectVector(this.velocity, this.velocity, this.up_dir, this.restitution);
			}			
			
			h = vMath.vec3.dot(projected_position, this.right_dir);
			if(h >= this.walls_dist-1.5*this.radius){
				this.ReflectVector(this.velocity, this.velocity, this.right_dir, this.restitution);
			}
			h = vMath.vec3.dot(projected_position, this.left_dir);
			if(h >= this.walls_dist-1.5*this.radius){
				this.ReflectVector(this.velocity, this.velocity, this.left_dir, this.restitution);
			}			
			
			h = vMath.vec3.dot(projected_position, this.forward_dir);
			if(h >= this.walls_dist-1.5*this.radius){
				this.ReflectVector(this.velocity, this.velocity, this.forward_dir, this.restitution);
			}
			h = vMath.vec3.dot(projected_position, this.back_dir);
			if(h >= this.walls_dist-1.5*this.radius){
				this.ReflectVector(this.velocity, this.velocity, this.back_dir, this.restitution);
			}
		}
		fluidSim.SphereBarrier.ClampVelocity = function(max_velocity){	
			let d = vMath.vec3.length(this.velocity);
			if(d > max_velocity){
				let n = [0.0,0.0,0.0];
				vMath.vec3.scale(n, this.velocity, 1.0/d);
				vMath.vec3.scale(this.velocity, n, max_velocity);
			}
		}
		fluidSim.SphereBarrier.UpdatePosition = function(dt){
			
			let dx = [0.0,0.0,0.0]; vMath.vec3.scale(dx, this.velocity, dt);
			vMath.vec3.add(this.position, this.position, dx);
		}
		fluidSim.SphereBarrier.Update = function(dt){
			
			this.UpdateMovementTowardsGoal2D(dt);
			this.UpdateGravity(dt);
			this.UpdateDrag(dt);
			this.BounceOfWalls(dt);
			
			this.ClampVelocity(this.max_velocity);
			
			this.UpdatePosition(dt);
		}
		//--------------------------------------------------------------
		
		//-----------------------------------------------------------------------------------------------
		
		//div kvadrat koji reprezentira sphere barrier i njeno micanje u 2D planeu
		//-----------------------------------------------------------------------------------------------
		barrier = document.getElementById("barriermove_kvadrat");
		barrier.bIsMouseOver = false;
		barrier.bIsMouseDown = false;
		barrier.radius = fluidSim.SphereBarrier.radius * fluidSim.SphereBarrier.ToRealWorldScale;
		barrier.baseWindowOffset = [gl.canvasObject.offsetLeft, gl.canvasObject.offsetTop];
		barrier.baseSize = 2560.0 * fluidSim.SphereBarrier.radius;
		barrier.mouse = sys.mouse;
		barrier.bUpdateTowadsGoal = false;
		barrier.goal_position2D = [0.0,0.0];
		barrier.position2D = [0.0,0.0];
		
		barrier.setScreenPosition = function(pos){
			this.style.position = "absolute";
			this.style.left =(pos[0] + this.baseWindowOffset[0] - 0.5*this.offsetWidth) + "px";
			this.style.top = (pos[1] + this.baseWindowOffset[1] - 0.5*this.offsetHeight) + "px";
			// vMath.vec2.subtract(this.delta_position, pos, this.position2D);
			vMath.vec2.copy(this.position2D, pos);
		}
		barrier.setPositionAndSize = function(pos, size){
			this.style.width = size + "px";
			this.style.height = size + "px";
			this.setScreenPosition(pos);
		}
		// .addEventListener("mouseenter", 
		barrier.onmouseover = function(){ if(this.mouse.get().btnLeft == false) this.bIsMouseOver = true; }
		barrier.onmouseout = function(){ this.bIsMouseOver = false; }
		barrier.onmousedown = function(){ if(this.bIsMouseOver == true) this.bIsMouseDown = true; }
		barrier.onmouseup = function(){ this.bIsMouseDown = false; }
		barrier.onmouseenter = barrier.onmouseover;
		barrier.onmouseleave = barrier.onmouseout;
		
		barrier.UpdateGoalPosition = function(mouse, Camera, bCameraUpdated, fluidSim){
			if(bCameraUpdated == false && this.bIsMouseDown == true){
				vMath.vec2.copy(this.goal_position2D, mouse.getPosition());
				this.bUpdateTowadsGoal = true;
			}
			else{
				this.bUpdateTowadsGoal = false;
			}
			fluidSim.SphereBarrier.bUpdateTowadsGoal = this.bUpdateTowadsGoal;
			fluidSim.SphereBarrier.setGoalPosition2D(this.goal_position2D, Camera);
		}
		barrier.Update = function(dt, mouse, Camera, bCameraUpdated, fluidSim){
			if(this.bIsMouseDown == true && mouse.get().btnLeft == false){ this.bIsMouseDown = false; }
			this.UpdateGoalPosition(mouse, Camera, bCameraUpdated, fluidSim);
		}
		//-----------------------------------------------------------------------------------------------
	}
	
	vMath.mat4.perspective(projectionMatrix, vMath.deg2rad(40.0), gl.viewportWidth/gl.viewportHeight, 0.1, 1000.0);
	
	vMath.mat4.lookAt(viewMatrix, eyePt, centerPt, upDir);
	// vMath.mat4.identity(viewMatrix);
	// vMath.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -7.0]);
	
	vMath.mat4.identity(sphere_model.Transform);
	// vMath.mat4.scale(sphere_model.Transform, sphere_model.Transform, [4.0,4.0,4.0]);
	vMath.mat4.rotate(sphere_model.Transform, sphere_model.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	var time = 0.0;
	sys.time.init();
	
	var oldframe_time = -1.0;
	var avg_frame_time = 1.0/60.0;
	var FPSlabel = document.getElementById("label_FPS");
	/* var FPSSlider = document.getElementById("fps_slider");
	FPSSlider.fvalue = function(){
		var v = this.value; //0, 10
		v = v - 4.0; //-4, 6
		v = Math.pow(2.0, v); //0.0625, 64.0
		return v;
	} */
	
	var lastRecompileTime = sys.time.getSecondsSinceStart();
	
	simple_shader.setFlagsUniform(1);
	
	var IdentityMatrix = vMath.mat4.create();
	vMath.mat4.identity(IdentityMatrix);
	
	var MipGen = new glext.MipMapGen();
	if((bUseHDR == false) || (bUseHDR == true && bStoreHDRinRGBA8 == true))
		MipGen.Create(gl.viewportWidth, gl.viewportHeight, gl.RGBA8, "mipmapVS", "3x3MipGenFS");
	else
		MipGen.Create(gl.viewportWidth, gl.viewportHeight, gl.RGBA16F, "mipmapVS", "3x3MipGenFS");
	
	// var Flags = 1;
	// var time_of_start = sys.time.getTimeµs();
	glext.BlendMode.Enable();
		
	// var circularMov = [0.0, 0.0]; //azimuth, inclination
	// var distFromObject = 7.0;
	
	var RightAdd = vMath.vec3.create();
	var UpAdd = vMath.vec3.create();
	
	var FOV = 75.0;
	
	Camera.setPositionAndLookPt(eyePt, [0.0,0.0,0.0], upDir);
	Camera.setFOV(FOV);
	
	var bCtrlToggle = false;
	var bShiftToggle = false;
	
	var delay_ms = 17;
/*  
	let testv3D_1 = [0.0,0.0,0.0];
	let testv2D_1 = [250.0,250.0];
	
	while(true){
		
		testv3D_1 = fluidSim.SphereBarrier.TransformFromScreenCoordinates(testv2D_1, Camera);
		testv2D_1 = fluidSim.SphereBarrier.TransformToScreenCoordinates(testv3D_1, Camera);
	}*/
	
	setInterval( function(){ window.requestAnimationFrame(renderFrame); }, delay_ms);
	
	function renderFrame()
	{
		time = sys.time.getSecondsSinceStart();
		var frame_time = time - oldframe_time;
		
		var avg_FPS = 1.0 / avg_frame_time;
		
		if(oldframe_time > 0.0 && frame_time > 1.0 / 70.0){
			avg_frame_time = vMath.lerp(avg_frame_time, frame_time, 1.0 / 30.0);
			avg_FPS = 1.0 / avg_frame_time;
			
			if(bAutoQualitySelect == true && (time - lastRecompileTime) > 5.0)
			{
				if(avg_FPS < 20.0 && QualitySelect > 0){
					volume_clouds_shader.RemoveDefine(strQualitySelect[QualitySelect]);
					QualitySelect--;
					volume_clouds_shader.addDefine(strQualitySelect[QualitySelect],"");
					recompileShader("volume_clouds_shader");
					lastRecompileTime = sys.time.getSecondsSinceStart();
				}
				else if(avg_FPS > 40.0 && QualitySelect < 2){
					volume_clouds_shader.RemoveDefine(strQualitySelect[QualitySelect]);
					QualitySelect++;
					volume_clouds_shader.addDefine(strQualitySelect[QualitySelect],"");
					recompileShader("volume_clouds_shader");
					lastRecompileTime = sys.time.getSecondsSinceStart();
				}
			}
		}
		
		// FPSlabel.textContent = (1.0/avg_frame_time).toString();
		FPSlabel.textContent = Number.parseFloat(avg_FPS).toFixed(2) + " FPS";
		
		var ctime = Math.cos(time);
		var stime = Math.sin(time);
		var ctime10 = Math.cos(10*time);
		
		// if(checkWindowsSizeAndResizeCanvas() == true){
			// Camera.setViewportWidthHeight(gl.viewportWidth,gl.viewportHeight);}
		
		// glext.Framebuffer.BindMainFB();
		
		//Calc camera view i proj
		//-------------------------------------------------------------------------------------
		var bUpdateCamera = false;
		
		var mousePos = sys.mouse.getPosition();
		var mouseDelta = sys.mouse.getDeltaPosition();
		
		var SphereBarrierPositionOffset = [0.0,0.0,0.0];
		
		if(bMouseOverCanvas == true)
		{
			orbital.dinclination = 0.0;
			orbital.dazimuth = 0.0;
			
			if(sys.mouse.get().btnLeft == true && barrier.bIsMouseDown == false)
			{
				if(mouseDelta[0] != 0 || mouseDelta[1] != 0)
				{
					orbital.dazimuth = -mouseDelta[0];
					orbital.dinclination = mouseDelta[1];
					
					bUpdateCamera = true;
				}
			}
			
			if(sys.mouse.get().dz != 0)
			{
				orbital.radius = orbital.radius - orbital.radius*(sys.mouse.get().dz / 20.0);
				if(orbital.radius < 0.1) orbital.radius = 0.1;
				if(orbital.radius > 100.0) orbital.radius = 100.0;
				bUpdateCamera = true;
			}
			
			if(bUpdateCamera == true)
			{			
				// eyePt = vMath.sph2cart3D(orbital.azimuth, orbital.inclination, orbital.radius);
				var sinA = Math.sin(vMath.deg2rad(orbital.dazimuth)); var sinI = Math.sin(vMath.deg2rad(orbital.dinclination));
				vMath.vec3.scale(RightAdd, Camera.RightDir, orbital.radius * sinA);
				vMath.vec3.scale(UpAdd, Camera.UpDir, orbital.radius * sinI);
				vMath.vec3.add(eyePt, eyePt, RightAdd);
				vMath.vec3.add(eyePt, eyePt, UpAdd);
				
				vMath.vec3.normalize(eyePt, eyePt);
				vMath.vec3.scale(eyePt, eyePt, orbital.radius);
				
				Camera.setPositionAndLookPt(eyePt, [0.0,0.0,0.0], upDir);
				Camera.CalcInverseViewProjectionMatrix();
				
				vMath.vec3.copy(upDir, Camera.UpDir);
			}
			/* else
			{
				let deltaX = [0.0,0.0,0.0];
				let deltaY = [0.0,0.0,0.0];
				
				vMath.vec3.copy(deltaX, Camera.RightDir);
				vMath.vec3.copy(deltaY, Camera.UpDir);
				
				if(orbital.radius < 0.1) orbital.radius = 0.1;
				
				vMath.vec3.scale(deltaX, deltaX, (mouseDelta[0]/orbital.radius) );
				vMath.vec3.scale(deltaY, deltaY,  mouseDelta[1]/orbital.radius);
				
				vMath.vec3.add(SphereBarrierPositionOffset, SphereBarrierPositionOffset, deltaX);
				vMath.vec3.add(SphereBarrierPositionOffset, SphereBarrierPositionOffset, deltaY);
			} */
		}
		
		/*	
		{
				
			if(sys.mouse.get().btnLeft == true)
				if(sys.mouse.get().dx != 0 || sys.mouse.get().dy != 0){
					Camera.Rotate(sys.mouse.get().dx / 100.0, sys.mouse.get().dy / 100.0);
					Camera.CalcInverseViewProjectionMatrix();
				}
				
			var MovementDelta = .01;
			if(sys.keyboard.isCtrlPressed()) bCtrlToggle = !bCtrlToggle;
			if(sys.keyboard.isShiftPressed()) bShiftToggle = !bShiftToggle;
			if(bCtrlToggle == true) MovementDelta *= 0.1;
			else if(bShiftToggle == true) MovementDelta *= 10.0;
			
			if(sys.keyboard.isKeyPressed("w"))      Camera.MoveForward(MovementDelta);
			else if(sys.keyboard.isKeyPressed("s")) Camera.MoveForward(-MovementDelta);
			
			if(sys.keyboard.isKeyPressed("a"))      Camera.MoveRight(MovementDelta);
			else if(sys.keyboard.isKeyPressed("d")) Camera.MoveRight(-MovementDelta);
			
			if(sys.keyboard.isKeyPressed("r"))      Camera.MoveUp(MovementDelta);
			else if(sys.keyboard.isKeyPressed("f")) Camera.MoveUp(-MovementDelta);
			
			if(sys.keyboard.isKeyPressed("e"))      Camera.Tilt(0.1*MovementDelta);
			else if(sys.keyboard.isKeyPressed("q")) Camera.Tilt(-0.1*MovementDelta);
			
			Camera.CalcInverseViewMatrix();
		}
		*/
		
		//-------------------------------------------------------------------------------------
		
		{
			let dt = avg_frame_time; if(dt > 0.1) dt = 0.1;
			
			//slideri
			//-------------------------------------------------------
				let c = fluidsimPressureIterationCountSlider.value;
				fluidsimPressureIterationCountSlider.title = "pressure iteration count: " + c.toString();
				fluidSim.setPressureIterationNumber(c);
				
				let viscosity = fluidsimViscositySlider.fvalue(); //Number.parseFloat(avg_FPS).toFixed(2)
				fluidsimViscositySlider.title = "viscosity: " + Number.parseFloat(viscosity).toFixed(5);
				fluidSim.setKinematicViscosity(viscosity);
				
				let brightness = fluidsimBrightnessSlider.fvalue();
				fluidsimBrightnessSlider.title = "brightness: " + Number.parseFloat(brightness).toFixed(4);
				fluidSim.setDisplayBrightness(brightness);
			//-------------------------------------------------------
			
			//simulacija
			//-------------------------------------------------------
			if(bFluidSimPass == true)
			{
				//micanje barriera mišem
				barrier.Update(dt, sys.mouse, Camera, bUpdateCamera, fluidSim);
				
				//simulacija micanja barriera
				//-------------------------------------------------------
				// let oscAmp = 0.25, oscSpeed = 0.75;
				/* fluidSim.SphereBarrier.position = [0.5, 0.5 + oscAmp*Math.cos(oscSpeed*fluidSim.time), 0.5 ];
				fluidSim.SphereBarrier.velocity = [0.0, -oscAmp*oscSpeed*Math.sin(oscSpeed*fluidSim.time), 0.0 ]; */
				// fluidSim.SphereBarrier.setPosition([0.5, 0.5 + oscAmp*Math.cos(oscSpeed*fluidSim.time), 0.5 ], dt);
				// fluidSim.SphereBarrier.addOffset(SphereBarrierPositionOffset, dt);
				// fluidSim.SphereBarrier.addOffsetFromScreenCoords(barrier.getDeltaPosition(), dt, Camera);
				fluidSim.SphereBarrier.Update(dt);
				//-------------------------------------------------------
				
				fluidSim.SimStep(dt);
				fluidSim.AdvectMass(dt);
				
				// glext.Framebuffer.BindMainFB();	
				// gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
				
				// fluidSim.Display(); //display preko fluidsim/debug_display
				
				//postavljanje on screen pozicije kvadrata za micanje
				barrier.setPositionAndSize(fluidSim.SphereBarrier.getPositionOnScreen(Camera), barrier.baseSize/fluidSim.SphereBarrier.getDistanceToCamera(Camera));
			}
			//-------------------------------------------------------
			
		}
		
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
		
		{
			light.setPosition(1.0, 0.0, 2.5); //*ctime
			light.setDisplaySize(5.0);
			light.setDisplayColor(0.5,0.79,1.0,1.0);
			light.setMatrices( Camera.ViewMatrix, Camera.ProjectionMatrix );
			light.setIntensity(4.0);
			light.setColor(0.5,0.79,1.0,1.0);
			light.Update();
			
			let r = 2.0*fluidSim.SphereBarrier.radius * fluidSim.SphereBarrier.ToRealWorldScale; let p = [0,0,0];
			vMath.vec3.copy(p, fluidSim.SphereBarrier.position);
			vMath.vec3.scale(p, p, fluidSim.SphereBarrier.ToRealWorldScale);
			vMath.mat4.identity(sphere_model.Transform);
			vMath.mat4.setTranslation(sphere_model.Transform, sphere_model.Transform, p);
			vMath.mat4.setScale(sphere_model.Transform, sphere_model.Transform, [r,r,r]);
			
			//Render scene
			fbo.Bind();
			
			gl.viewport(0, 0, fbo.width, fbo.height);
			// Camera.setViewportWidthHeight(fbo.width, fbo.height);
			
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clearDepth(1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			light.RenderPosition();
			
			simple_shader.Bind();
			
				txD.Bind(0, simple_shader.ULTextureD);
				txN.Bind(1, simple_shader.ULTextureN);
				txAoRS.Bind(2, simple_shader.ULTextureAoRS);
				// txAmb.Bind(3, simple_shader.ULTextureAmb);
				
				simple_shader.setViewMatrixUniform( Camera.ViewMatrix );
				simple_shader.setProjectionMatrixUniform( Camera.ProjectionMatrix );
				
				simple_shader.setTimeUniform(time);
				
				simple_shader.setCameraPositionUniform(Camera.Position);
				
				sphere_model.RenderIndexedTriangles(simple_shader);
		}
		
		//Render fluidsim cloud
		{
			glext.Framebuffer.BindMainFB();	
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
			// Camera.setViewportWidthHeight(gl.viewportWidth, gl.viewportHeight);
			
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clearDepth(1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			volume_clouds_shader.Bind();
				txNoiseRGB.Bind(0, volume_clouds_shader.ULTextureNoiseRGB);
				txfbColor.Bind(1, volume_clouds_shader.ULTextureBackground);
				txfbDepth.Bind(2, volume_clouds_shader.ULTextureBackgroundDepth);
				fluidSim.txVelocity.Bind(3, volume_clouds_shader.ULTextureVelocity);
				fluidSim.txMass.Bind(4, volume_clouds_shader.ULTextureMass);
				fluidSim.txPressure.Bind(5, volume_clouds_shader.ULTexturePressure);
				fluidSim.txDivergence.Bind(6, volume_clouds_shader.ULTextureDivergence);
				
				let brightness = fluidsimBrightnessSlider.fvalue();
				// volume_clouds_shader.setViewMatrixUniform( Camera.ViewMatrix );
				// volume_clouds_shader.setProjectionMatrixUniform( Camera.ProjectionMatrix );
				// volume_clouds_shader.setMatrix4Uniform( volume_clouds_shader.ULInverseViewMatrix, Camera.InverseViewMatrix);
				volume_clouds_shader.setFloat3Uniform( volume_clouds_shader.ULCameraForward, Camera.ForwardDir );
				volume_clouds_shader.setFloat3Uniform( volume_clouds_shader.ULCameraRight, Camera.RightDir );
				volume_clouds_shader.setFloat3Uniform( volume_clouds_shader.ULCameraUp, Camera.UpDir );
				volume_clouds_shader.setFloat2Uniform( volume_clouds_shader.ULMouse, mousePos );
				volume_clouds_shader.setFloat2Uniform( volume_clouds_shader.ULResolution, [gl.viewportWidth,gl.viewportHeight] );
				volume_clouds_shader.setFloatUniform( volume_clouds_shader.ULPixelAspect, gl.viewportWidth/gl.viewportHeight );
				volume_clouds_shader.setFloatUniform( volume_clouds_shader.ULDisplayBrightness, brightness );
				volume_clouds_shader.setFloatUniform( volume_clouds_shader.ULTanHalfFOV, Math.tan(vMath.deg2rad(FOV)/2.0) );
				
				volume_clouds_shader.setTimeUniform(time);
				
				volume_clouds_shader.setCameraPositionUniform(Camera.Position);			
				
				quad_model.RenderIndexedTriangles(volume_clouds_shader);		
		}
		
		sys.mouse.Update();
		sys.keyboard.Update();
		gl.flush();
		gs.Update();
		
		oldframe_time = time;
	}
	
	return; /* */
}

export function ReloadFluidSimShaders(){
	if(gFluidSim == null) return;
	gFluidSim.RecompileShaders();
	gFluidSim.RecompileMassShaders();
}
export function FluidSimDisplayChanged(select_element_id, default_value, additional_define){
	if(gFluidSim == null) return;
	var select_element = document.getElementById(select_element_id);
	if(select_element == null) return
	
	var setting = select_element.value;
	gFluidSim.setDisplayType(setting);
}
export function FluidSimSetKinematicViscosity(element_id){
	if(gFluidSim == null) return;
	var obj = document.getElementById(element_id);
	if(obj == null) return;
	
	var value = parseFloat(obj.value);
	gFluidSim.setKinematicViscosity(value);
}
export function FluidSimReset(){
	if(gFluidSim == null) return;
	gFluidSim.ClearBuffers();
	gFluidSim.ResetMass();
}
export function FluidSimTogglePause(){
	bFluidSimPass = !bFluidSimPass;
	return !bFluidSimPass;
}

function RenderModels(fbo, bClearFBO, time, camera, models){
	
	if(fbo != null){
		fbo.Bind();
		gl.viewport(0, 0, fbo.width, fbo.height);
	}
	
	if(bClearFBO == true){ gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);}
	
	for(var m = 0; m < models.length; ++m){
		var model = models[m];
		var shader = glext.ShaderList.get(model.shaderID);
		
		shader.Bind();
		
			model.BindTexturesToShader(shader);
		
			shader.setViewMatrixUniform( camera.ViewMatrix );
			shader.setProjectionMatrixUniform( camera.ProjectionMatrix );
			shader.setCameraPositionUniform(camera.Position);
			shader.setTimeUniform(time);
			
			model.RenderIndexedTriangles(shader);
	}
}


export function recompileShader(fragment_name){
	if(gl == null) return;
	
	for(var i = 0; i < glext.ShaderList.count(); ++i)
	{
		var shader = glext.ShaderList.get(i);
		if(shader.FragmentShaderName == fragment_name)
		{
			var bResetDefines = true;
			
			switch(fragment_name){
				case "transparent_shader":
				break;
				case "deferred_opaque_shade":
				break;
				case "deferred_BcNAoRSMt":
				break;
				case "atmosphere_shader":
				break;
				case "volume_clouds_shader":
					bResetDefines = false;
				break;
				default: break;
			}
			
			shader.Recompile(bResetDefines);
			shader.InitDefaultAttribLocations();
			shader.InitDefaultUniformLocations();
			
			switch(fragment_name){
				case "transparent_shader":
					shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
					shader.ULTextureBackground = shader.getUniformLocation("txBackground");
					glext.LightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "deferred_opaque_shade":
					shader.ULInvViewProjMatrix = shader.getUniformLocation("InverseViewProjectionMatrix");
					glext.LightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "deferred_BcNAoRSMt":
					shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
				break;
				case "atmosphere_shader":
					// shader.lightUniforms = glext.Light.getUniformLocationsFromShader(shader, "light0");
					glext.LightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "volume_clouds_shader":
					shader.ULTextureMass = shader.getUniformLocation("txFluidSimCloud");
					shader.ULTextureVelocity = shader.getUniformLocation("txFluidSimVelocity");
					shader.ULTexturePressure = shader.getUniformLocation("txFluidSimPressure");
					shader.ULTextureDivergence = shader.getUniformLocation("txFluidSimDivergence");
					shader.ULTextureNoiseRGB = shader.getUniformLocation("txNoiseRGB");
					shader.ULTextureBackground = shader.getUniformLocation("txBackground");
					shader.ULTextureBackgroundDepth = shader.getUniformLocation("txDepth");
					shader.ULDisplayBrightness = shader.getUniformLocation("displayBrightness");
					shader.ULTanHalfFOV = shader.getUniformLocation("TanHalfFOV");
					glext.LightList.get(0).AttachUniformBlockTo(shader);
					// shader.ULInverseViewMatrix = shader.getUniformLocation("InverseViewMatrix");
					shader.ULCameraForward = shader.getUniformLocation("CameraForward");
					shader.ULCameraRight = shader.getUniformLocation("CameraRight");
					shader.ULCameraUp = shader.getUniformLocation("CameraUp");
					shader.ULMouse = shader.getUniformLocation("Mouse");
					shader.ULResolution = shader.getUniformLocation("Resolution");
					shader.ULPixelAspect = shader.getUniformLocation("PixelAspect");
				break;
				default: break;
			}
			
			break;
		}
	}	
}


export function reloadTexture(texture_name){
	if(gl == null) return;
	
	for(var i = 0; i < glext.TextureList.count(); ++i)
	{
		var texture = glext.TextureList.get(i);
		if(texture.name == texture_name){
			texture.Reload();
			break;
		}
	}
}

function checkWindowsSizeAndResizeCanvas(){
	if(gl == null) return false;
	
	var wOmjer = gl.viewportWidth / window.innerWidth;
	var hOmjer = gl.viewportHeight / window.innerHeight;
	
	if(vMath.floatEqual(wOmjer, 1.0, 0.05) == true && vMath.floatEqual(hOmjer, 1.0, 0.05) == true) return false;

	glext.ResizeCanvas(window.innerWidth, window.innerHeight);	
	return true;
}

export function onShaderDefineChanged(shader_name, select_element_id, default_value, additional_define){
	var select_element = document.getElementById(select_element_id);
	if(select_element == null) return;
	
	var shaders = glext.ShaderList.getAllWithName(shader_name);
	if(shaders.length <= 0) return;
	
	var setting = select_element.value;
	var all_settings = []; for(var i = 0; i < select_element.options.length; ++i){ all_settings[i] = select_element.options[i].value; }
	
	for(var i = 0; i < shaders.length; ++i){
		shaders[i].RemoveDefine(additional_define);
		for(var j = 0; j < all_settings.length; ++j){
			shaders[i].RemoveDefine(all_settings[j]);
		}
	}
	
	if(setting == default_value){
		for(var i = 0; i < shaders.length; ++i)
			recompileShader(shaders[i].FragmentShaderName);
	}
	else{
		for(var i = 0; i < shaders.length; ++i){
			shaders[i].addDefine(additional_define);
			shaders[i].addDefine(setting);
			recompileShader(shaders[i].FragmentShaderName);
		}
	}
}

export function SetAutoQualitySelection(bOn){
	bAutoQualitySelect = bOn;
		
	var shaders = glext.ShaderList.getAllWithName("volume_clouds_shader");
	if(shaders.length <= 0) return;
	
	for(var i = 0; i < shaders.length; ++i){
		for(var j = 0; j < strQualitySelect.length; ++j){
			shaders[i].RemoveDefine(strQualitySelect[j]);
		}
	}
	
}










