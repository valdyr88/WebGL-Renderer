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
		
	gl = glext.glInit("glcanvas");
	if(gl == null) return;
	
		 if(gl.isWGL2 == false && glext.glEnableExtension('OES_texture_float') == false) alert("no extension: OES_texture_float");
		 if(gl.isWGL2 == false && glext.glEnableExtension('EXT_shader_texture_lod') == false) alert("no extension: EXT_shader_texture_lod");
		 if(glext.glEnableExtension('EXT_color_buffer_float') == false) alert("no extension: EXT_color_buffer_float");
		 if(glext.glEnableExtension('OES_texture_float_linear') == false) alert("no extension: OES_texture_float_linear");
		
	glext.InitDebugTextDOM("debug_text");
	
	var bMouseOverCanvas = false;
	gl.canvasObject.onmouseover = function(){ bMouseOverCanvas = true; }
	gl.canvasObject.onmouseout = function(){ bMouseOverCanvas = false; }
	
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
	
	var shader = new glext.Shader(0);
	if(shader.CompileFromFile("simpleVS", "deferred_BcNAoRSMt") == false) alert("nije kompajliran shader!");
	shader.setVertexAttribLocations("aVertexPosition","aVertexNormal","aVertexTangent",null,"aTexCoords");
	shader.setTransformMatricesUniformLocation("ModelMatrix","ViewMatrix","ProjectionMatrix");
	shader.setDefaultTextureUniformLocations("txDiffuse","txNormal","txAoRS");
	shader.setBRDFLUTTextureUniformLocation("txBRDF");
	shader.setFlagsUniformLocation("uFlags");
	shader.setTimeUniformLocation("Time");
	shader.setCameraPositionUniformLocation("CameraPosition");
	
	shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
	
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
	// volume_clouds_shader.ULInverseViewMatrix = volume_clouds_shader.getUniformLocation("InverseViewMatrix");
	volume_clouds_shader.ULCameraForward = volume_clouds_shader.getUniformLocation("CameraForward");
	volume_clouds_shader.ULCameraRight = volume_clouds_shader.getUniformLocation("CameraRight");
	volume_clouds_shader.ULCameraUp = volume_clouds_shader.getUniformLocation("CameraUp");
	volume_clouds_shader.ULMouse = volume_clouds_shader.getUniformLocation("Mouse");
	volume_clouds_shader.ULResolution = volume_clouds_shader.getUniformLocation("Resolution");
	volume_clouds_shader.ULPixelAspect = volume_clouds_shader.getUniformLocation("PixelAspect");
	volume_clouds_shader.ULTextureMass = volume_clouds_shader.getUniformLocation("txFluidSimCloud");
	volume_clouds_shader.ULTextureVelocity = volume_clouds_shader.getUniformLocation("txFluidSimVelocity");
	volume_clouds_shader.ULDisplayBrightness = volume_clouds_shader.getUniformLocation("displayBrightness");
	
	var SkySphereModel = new glext.Model(0);
	SkySphereModel.ImportFrom("SphereModel");
	// glext.GenCubeModel(model);
	
	var model = new glext.Model(1);
	model.ImportFrom("SphereModel");
	
	var navigatorModel = new glext.Model(2);
	navigatorModel.ImportFrom("navigatorModel");
	
	var quad_model = new glext.Model(2);
	glext.GenQuadModel(quad_model);
	
	var AtmoSphereModel = new glext.Model(4);
	AtmoSphereModel.ImportFrom("SphereModel");
	
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
	
	var txAmb = new glext.TextureCube(0); txAmb.CreateFromDOMDataElements("tx128");	
			
	var light = new glext.Light(0);
	// var lightUniforms = glext.Light.getUniformLocationsFromShader(shader,"light0");
	// var lightUniforms_backbuffer_shader = glext.Light.getUniformLocationsFromShader(deferred_opaque_shade,"light0");
	// atmosphere_shader.lightUniforms = glext.Light.getUniformLocationsFromShader(atmosphere_shader, "light0");
	// light.AttachUniformBlockTo(shader);	
	
	var projectionMatrix = vMath.mat4.create();
	var viewMatrix = vMath.mat4.create();
	
	var eyePt = vMath.vec3.fromValues(-2.0,0.0,0.0);
	var centerPt = vMath.vec3.fromValues(0.0,0.0,0.0);
	var upDir = vMath.vec3.fromValues(0.0,0.0,1.0);
	
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
		glext.TextureList.addTexture(txAmb);
		glext.TextureList.addTexture(txfbColor);
		glext.TextureList.addTexture(txfbNormal);
		glext.TextureList.addTexture(txfbAoRSMt);
		glext.TextureList.addTexture(txfbDepth);
		glext.TextureList.addTexture(txfbHdrMipBlur);
		glext.TextureList.addTexture(txAtmosphere);
		glext.TextureList.addTexture(txNoiseRGB);
		
		glext.ShaderList.addShader(shader);
		glext.ShaderList.addShader(skybox_shader);
		glext.ShaderList.addShader(deferred_opaque_shade);
		glext.ShaderList.addShader(transparent_shader);
		glext.ShaderList.addShader(backbuffer_shader);
		glext.ShaderList.addShader(atmosphere_shader);
		glext.ShaderList.addShader(volume_clouds_shader);
		
		model.setTexture(txD,"txDiffuse");
		model.setTexture(txN,"txNormal");
		model.setTexture(txAoRS,"txAoRS");
		// model.setTexture(txAmb,"txAmbient");
		model.setShader(shader);
		
		SkySphereModel.setTexture(txAmb,"txAmbient");
		SkySphereModel.setShader(skybox_shader);
		
		AtmoSphereModel.setTexture(txAtmosphere, "txDiffuse");
		AtmoSphereModel.setShader(atmosphere_shader);
		AtmoSphereModel.setBlendMode(glext.BlendMode_AlphaBlend);
		
		navigatorModel.setTexture(txGlassN,"txNormal");
		navigatorModel.setTexture(txGlassAoRS,"txAoRS");
		navigatorModel.setTexture(txfbDepth,"txDepth");
		navigatorModel.setTexture(txBRDF_LUT,"txBRDF");
		navigatorModel.setTexture(txAmb,"txAmbient");
		navigatorModel.setTexture(txfbHdrMipBlur,"txBackground");
		navigatorModel.setShader(transparent_shader);
		
		quad_model.setTexture(txfbColor,"txDiffuse");
		quad_model.setTexture(txfbNormal,"txNormal");
		quad_model.setTexture(txfbAoRSMt,"txAoRS");
		quad_model.setTexture(txfbDepth,"txDepth");
		quad_model.setTexture(txBRDF_LUT,"txBRDF");
		quad_model.setTexture(txAmb,"txAmbient");
		quad_model.setShader(deferred_opaque_shade);
		
		light.AttachUniformBlockTo(deferred_opaque_shade);	
		light.AttachUniformBlockTo(transparent_shader);	
		light.AttachUniformBlockTo(atmosphere_shader);
		light.AttachUniformBlockTo(volume_clouds_shader);
		
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
	
	if(b3DFluidSim == true){
		fluidSim.CreateTest3DRenderShader("test_3d_texture_render");
		fluidSim.setNoiseTexture(txNoiseRGB);
		fluidSim.CreateMass(256,256,256, false, false, "fluidsim_mass_init_shader", "fluidsim_mass_advect_shader");
	}
	
	vMath.mat4.perspective(projectionMatrix, vMath.deg2rad(40.0), gl.viewportWidth/gl.viewportHeight, 0.1, 1000.0);
	
	vMath.mat4.lookAt(viewMatrix, eyePt, centerPt, upDir);
	// vMath.mat4.identity(viewMatrix);
	// vMath.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -7.0]);
	
	var Camera = new glext.Camera(0, gl.viewportWidth, gl.viewportHeight);
	Camera.setPositionAndDir(eyePt, [1.0,0.0,0.0], upDir);
	Camera.UpdateProjectionMatrix();
	
	vMath.mat4.identity(model.Transform);
	// vMath.mat4.scale(model.Transform, model.Transform, [4.0,4.0,4.0]);
	vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	vMath.mat4.identity(AtmoSphereModel.Transform); var atmoScale = 1.012;
	vMath.mat4.scale(AtmoSphereModel.Transform, AtmoSphereModel.Transform, [atmoScale,atmoScale,atmoScale]);
	
	vMath.mat4.identity(SkySphereModel.Transform);
	vMath.mat4.scale(SkySphereModel.Transform, SkySphereModel.Transform, [10.0,10.0,10.0]);
	vMath.mat4.rotate(SkySphereModel.Transform, SkySphereModel.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
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
	
	shader.setFlagsUniform(1);
	
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
	
	var orbital = [];
	orbital.radius = 2.0;
	orbital.inclination = 0.0;
	orbital.azimuth = 0.0;
	orbital.dinclination = 0.0;
	orbital.dazimuth = 0.0;
	
	var RightAdd = vMath.vec3.create();
	var UpAdd = vMath.vec3.create();
	
	Camera.setPositionAndLookPt(eyePt, [0.0,0.0,0.0], upDir);
	Camera.setFOV(75.0);
	
	var bCtrlToggle = false;
	var bShiftToggle = false;
	
	var delay_ms = 17;
	
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
		
		vMath.mat4.identity(model.Transform);
		vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(time*10), [0,0,1]);/*  */
		
		vMath.mat4.identity(navigatorModel.Transform);
		vMath.mat4.setTranslation(navigatorModel.Transform, navigatorModel.Transform, [ -1.0, -ctime*0.5, 0.0]);
		vMath.mat4.rotate(navigatorModel.Transform, navigatorModel.Transform, vMath.deg2rad(90), [0,1,0]);
		// glext.Framebuffer.BindMainFB();
		
		//Calc camera view i proj
		//-------------------------------------------------------------------------------------
		var bUpdateCamera = false;
		
		var mousePos = sys.mouse.getPosition();
		var mouseDelta = sys.mouse.getDeltaPosition();
		
		if(bMouseOverCanvas == true)
		{
			orbital.dinclination = 0.0;
			orbital.dazimuth = 0.0;
			
			if(sys.mouse.get().btnLeft == true)
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
				fluidSim.SimStep(0.1);
				fluidSim.AdvectMass(0.1);
				
				// glext.Framebuffer.BindMainFB();	
				// gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
				
				// fluidSim.Display(); //display preko fluidsim/debug_display
			}
			//-------------------------------------------------------
		}

		{			
			light.setPosition(1.0, 0.0, 2.0); //*ctime
			light.setDisplaySize(5.0);
			light.setDisplayColor(0.5,0.79,1.0,1.0);
			light.setMatrices( Camera.ViewMatrix, Camera.ProjectionMatrix );
			light.setIntensity(4.0);
			light.setColor(0.5,0.79,1.0,1.0);
			light.Update();
		}
		
		//Render volume_clouds_shader
		{
			glext.Framebuffer.BindMainFB();	
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
			
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
			gl.clearDepth(1.0);
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			light.RenderPosition();
						
			volume_clouds_shader.Bind();
				txNoiseRGB.Bind(0, volume_clouds_shader.ULTextureNoiseRGB);
				txfbColor.Bind(1, volume_clouds_shader.ULTextureBackground);
				fluidSim.txVelocity.Bind(2, volume_clouds_shader.ULTextureVelocity);
				fluidSim.txMass.Bind(3, volume_clouds_shader.ULTextureMass);
				
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
					shader.ULTextureNoiseRGB = shader.getUniformLocation("txNoiseRGB");
					shader.ULTextureBackground = shader.getUniformLocation("txBackground");
					shader.ULDisplayBrightness = shader.getUniformLocation("displayBrightness");
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










