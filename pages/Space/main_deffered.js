import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js"

var gl = null;

var bUseHDR = false;
var bStoreHDRinRGBA8 = true;

export function main(){
	
	var gs = sys.storage.CGlobalStorage.getSingleton();
	sys.mouse.InitMouse(document);
	sys.keyboard.InitKeyboard(document);
	
	gl = glext.glInit("glcanvas");
		 if(glext.isWGL2 && glext.glEnableExtension('OES_texture_float') == false) alert("no extension: OES_texture_float");
		 if(glext.isWGL2 && glext.glEnableExtension('EXT_shader_texture_lod') == false) alert("no extension: EXT_shader_texture_lod");
		 if(glext.glEnableExtension('OES_texture_float_linear') == false) alert("no extension: OES_texture_float_linear");
	if(gl == null) return;
	
	glext.InitDebugTextDOM("debug_text");
	
	gl.clearColor(0.0, 1.0, 1.0, 1.0);
	gl.blendColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.clearDepth(1.0); 
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	// gl.enable(gl.TEXTURE_CUBE_MAP_SEAMLESS);
	
	gl.disable(gl.BLEND);
	gl.depthFunc(gl.LESS);
	
	glext.CBlendMode.Init();
	
	if(bUseHDR == true && bStoreHDRinRGBA8 == true)
		glext.CShaderDefines.addGlobalDefine("USE_HDR_RGBA8","");
	else if(bUseHDR == true)
		glext.CShaderDefines.addGlobalDefine("USE_HDR","");
	
	glext.CShaderDefines.addGlobalDefine("MAX_LIGHTS", " "+glext.MAX_LIGHTS);
	
	var shader = new glext.CShader(0);
	if(shader.CompileFromFile("simpleVS", "deferred_BcNAoRSMt") == false) alert("nije kompajliran shader!");
	shader.setVertexAttribLocations("aVertexPosition","aVertexNormal","aVertexTangent",null,"aTexCoords");
	shader.setTransformMatricesUniformLocation("ModelMatrix","ViewMatrix","ProjectionMatrix");
	shader.setDefaultTextureUniformLocations("txDiffuse","txNormal","txAoRS");
	shader.setBRDFLUTTextureUniformLocation("txBRDF");
	shader.setFlagsUniformLocation("uFlags");
	shader.setTimeUniformLocation("Time");
	shader.setCameraPositionUniformLocation("CameraPosition");
	
	shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
	
	var skybox_shader = new glext.CShader(1);
	if(skybox_shader.CompileFromFile("simpleVS", "deferred_skybox") == false) alert("nije kompajliran shader!");
	skybox_shader.ULTextureAmb = skybox_shader.getUniformLocation("txAmbient");
	skybox_shader.InitDefaultUniformLocations();
	skybox_shader.InitDefaultAttribLocations();
	
	var deferred_opaque_shader = new glext.CShader(2);
	if(deferred_opaque_shader.CompileFromFile("viewquadVS", "deferred_opaque_shader") == false) alert("nije kompajliran shader!");
	deferred_opaque_shader.InitDefaultAttribLocations();
	deferred_opaque_shader.InitDefaultUniformLocations();
	deferred_opaque_shader.ULInvViewProjMatrix = deferred_opaque_shader.getUniformLocation("InverseViewProjectionMatrix");
	deferred_opaque_shader.ULCameraForwardDir = deferred_opaque_shader.getUniformLocation("CameraForwardDir");
	deferred_opaque_shader.ULCameraRightDir = deferred_opaque_shader.getUniformLocation("CameraRightDir");
	deferred_opaque_shader.ULCameraUpDir = deferred_opaque_shader.getUniformLocation("CameraUpDir");
	
	var transparent_shader = new glext.CShader(3);
	if(transparent_shader.CompileFromFile("simpleVS", "transparent_shader") == false) alert("nije kompajliran shader!");
	transparent_shader.InitDefaultAttribLocations();
	transparent_shader.InitDefaultUniformLocations();
	transparent_shader.ULTextureAmb = transparent_shader.getUniformLocation("txAmbient");
	transparent_shader.ULTextureBackground = transparent_shader.getUniformLocation("txBackground");
	
	var backbuffer_shader = new glext.CShader(4);
	if(backbuffer_shader.CompileFromFile("simpleVS", "backbuffer_shader") == false) alert("nije kompajliran shader!");
	backbuffer_shader.InitDefaultAttribLocations();
	backbuffer_shader.InitDefaultUniformLocations();
	
	var atmosphere_shader = new glext.CShader(5);
	if(atmosphere_shader.CompileFromFile("simpleVS", "atmosphere_shader") == false) alert("nije kompajliran shader!");
	atmosphere_shader.InitDefaultAttribLocations();
	atmosphere_shader.InitDefaultUniformLocations();
	
	var glow_integrate_shader = new glext.CShader(6);
	if(glow_integrate_shader.CompileFromFile("viewquadVS", "glow_integrate_shader") == false) alert("nije kompajliran shader!");
	glow_integrate_shader.InitDefaultAttribLocations();
	glow_integrate_shader.InitDefaultUniformLocations();
	glow_integrate_shader.ULInvViewProjMatrix = glow_integrate_shader.getUniformLocation("InverseViewProjectionMatrix");
	glow_integrate_shader.ULCameraForwardDir = glow_integrate_shader.getUniformLocation("CameraForwardDir");
	glow_integrate_shader.ULCameraRightDir = glow_integrate_shader.getUniformLocation("CameraRightDir");
	glow_integrate_shader.ULCameraUpDir = glow_integrate_shader.getUniformLocation("CameraUpDir");
	glow_integrate_shader.ULColor = glow_integrate_shader.getUniformLocation("txColor");
	glow_integrate_shader.ULGlow = glow_integrate_shader.getUniformLocation("txGlow");
		
	var SkySphereModel = new glext.CModel(0);
	SkySphereModel.ImportFrom("SphereModel");
	// glext.GenCubeModel(model);
	
	var model = new glext.CModel(1);
	model.ImportFrom("SphereModel");
	
	var navigatorModel = new glext.CModel(2);
	navigatorModel.ImportFrom("navigatorModel");
	
	var quad_model = new glext.CModel(2);
	glext.GenQuadModel(quad_model);
	
	var AtmoSphereModel = new glext.CModel(4);
	AtmoSphereModel.ImportFrom("SphereModel");
	
	var txBRDF_LUT = new glext.CTexture(3); txBRDF_LUT.CreateFromFile("txBRDF_LUT");
	txBRDF_LUT.setWrapTypeClampToEdge();
	
	var txD = new glext.CTexture(0); txD.CreateFromFile("txRock_D");
	var txN = new glext.CTexture(1); txN.CreateFromFile("txRock_N");
	var txAoRS = new glext.CTexture(2); txAoRS.CreateFromFile("txRock_AoRS");
	
	var txGlassAoRS = new glext.CTexture(-1); txGlassAoRS.CreateFromFile("txGlass_AoRS");
	var txGlassN = new glext.CTexture(-1); txGlassN.CreateFromFile("txGlass_N");
	
	var txAtmosphere = new glext.CTexture(-1); txAtmosphere.CreateFromFile("txAtmosphere");
	
	// var txAmb = new glext.CTextureCube(0); txAmb.CreateFromDOMDataElements("tx128");	
	var txAmb = new glext.CTextureCube(0); txAmb.CreateFromMultipleElementsInDOM("txAmbHDRVenice");	
	
	var light = new glext.CLight(0);
	// var lightUniforms = glext.CLight.getUniformLocationsFromShader(shader,"light0");
	// var lightUniforms_backbuffer_shader = glext.CLight.getUniformLocationsFromShader(deferred_opaque_shader,"light0");
	// atmosphere_shader.lightUniforms = glext.CLight.getUniformLocationsFromShader(atmosphere_shader, "light0");
	// light.AttachUniformBlockTo(shader);	
	
	var projectionMatrix = vMath.mat4.create();
	var viewMatrix = vMath.mat4.create();
	
	var eyePt = vMath.vec3.fromValues(-7.0,0.0,0.0);
	var centerPt = vMath.vec3.fromValues(0.0,0.0,0.0);
	var upDir = vMath.vec3.fromValues(0.0,1.0,0.0);
	
	//framebuffer
	//------------------------------------------------------------------------
	var fbo_width = gl.viewportWidth; var fbo_height = gl.viewportHeight;
	var txfbColor = new glext.CTexture(4); txfbColor.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var txfbDepth = new glext.CTexture(5); txfbDepth.CreateEmptyDepthfloat(fbo_width, fbo_height);
	var txfbNormal= new glext.CTexture(6); txfbNormal.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var txfbAoRSMt= new glext.CTexture(7); txfbAoRSMt.CreateEmptyRGBAubyte(fbo_width, fbo_height);
	var fboDeferred = new glext.CFramebuffer(true);   fboDeferred.Create(); 
	fboDeferred.AttachTexture(txfbColor, 0);
	fboDeferred.AttachTexture(txfbNormal,1);
	fboDeferred.AttachTexture(txfbAoRSMt,2);
	fboDeferred.AttachDepth(txfbDepth);
	fboDeferred.CheckStatus();
	
	var fboTransparent = new glext.CFramebuffer(true); fboTransparent.Create();
	fboTransparent.AttachTexture(txfbColor, 0);
	fboTransparent.AttachDepth(txfbDepth);
	fboTransparent.CheckStatus();
	
	var fboColorGlow = new glext.CFramebuffer(true); fboColorGlow.Create();
	fboColorGlow.AttachTexture(txfbColor, 0);
	fboColorGlow.AttachTexture(txfbAoRSMt, 1);
	fboColorGlow.CheckStatus();
	
	var fboHdrMipBlur = new glext.CFramebuffer(true); fboHdrMipBlur.Create(); fboHdrMipBlur.Bind();
	var txfbHdrMipBlur = new glext.CTexture(8); txfbHdrMipBlur.CreateEmptyWithMipsRGBAubyte(fbo_width, fbo_height);
	var txfbHdrMipBlur2 = new glext.CTexture(9); txfbHdrMipBlur2.CreateEmptyWithMipsRGBAubyte(fbo_width, fbo_height);
	fboHdrMipBlur.AttachTexture(txfbHdrMipBlur, 0);
	fboHdrMipBlur.AttachTexture(txfbHdrMipBlur2, 1);
	fboHdrMipBlur.AttachDepth(txfbDepth);
	fboHdrMipBlur.CheckStatus();
	
	var fboGlowIntegrate = new glext.CFramebuffer(true); fboGlowIntegrate.Create();
	fboGlowIntegrate.AttachTexture(txfbColor, 0);
	fboGlowIntegrate.CheckStatus();
	
	glext.CFramebuffer.BindMainFB();	
	//------------------------------------------------------------------------
		glext.CLightList.addLight(light);
		
		glext.CTextureList.addTexture(txD);
		glext.CTextureList.addTexture(txN);
		glext.CTextureList.addTexture(txAoRS);
		glext.CTextureList.addTexture(txGlassN);
		glext.CTextureList.addTexture(txGlassAoRS);
		glext.CTextureList.addTexture(txBRDF_LUT);
		glext.CTextureList.addTexture(txAmb);
		glext.CTextureList.addTexture(txfbColor);
		glext.CTextureList.addTexture(txfbNormal);
		glext.CTextureList.addTexture(txfbAoRSMt);
		glext.CTextureList.addTexture(txfbDepth);
		glext.CTextureList.addTexture(txfbHdrMipBlur);
		glext.CTextureList.addTexture(txfbHdrMipBlur2);
		glext.CTextureList.addTexture(txAtmosphere);
		
		glext.CShaderList.addShader(shader);
		glext.CShaderList.addShader(skybox_shader);
		glext.CShaderList.addShader(deferred_opaque_shader);
		glext.CShaderList.addShader(glow_integrate_shader);
		glext.CShaderList.addShader(transparent_shader);
		glext.CShaderList.addShader(backbuffer_shader);
		glext.CShaderList.addShader(atmosphere_shader);
		
		model.setTexture(txD,"txDiffuse");
		model.setTexture(txN,"txNormal");
		model.setTexture(txAoRS,"txAoRS");
		// model.setTexture(txAmb,"txAmbient");
		model.setShader(shader);
		
		SkySphereModel.setTexture(txAmb,"txAmbient");
		SkySphereModel.setShader(skybox_shader);
		
		AtmoSphereModel.setTexture(txAtmosphere, "txDiffuse");
		AtmoSphereModel.setShader(atmosphere_shader);
		AtmoSphereModel.setBlendMode(glext.CBlendMode.Alpha);
		
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
		quad_model.setShader(deferred_opaque_shader);
		
		light.AttachUniformBlockTo(deferred_opaque_shader);	
		light.AttachUniformBlockTo(transparent_shader);	
		light.AttachUniformBlockTo(atmosphere_shader);	
		
	txfbHdrMipBlur.setMinMagFilterLinearMipMapLinear();
	txfbHdrMipBlur2.setMinMagFilterLinearMipMapLinear();
	//------------------------------------------------------------------------
	
	// var sovereign = new glext.CModelAssembly(0);
	// sovereign.LoadAssemblyFromXML("sovereignAsb");
	
	var galaxy = new glext.CModelAssembly(0);
	galaxy.LoadAssemblyFromXML("galaxyAsb");
	
	var dderidex = new glext.CModelAssembly(0);
	dderidex.LoadAssemblyFromXML("dderidexAsb");

	dderidex.models[0].setTexture(txBRDF_LUT,"txBRDF");
	dderidex.models[0].setTexture(txAmb,"txAmbient");
	dderidex.models[0].setTexture(txfbHdrMipBlur,"txBackground");
	// dderidex.models[0].setShader(transparent_shader);
	
	vMath.mat4.perspective(projectionMatrix, vMath.deg2rad(40.0), gl.viewportWidth/gl.viewportHeight, 0.1, 1000.0);
	
	vMath.mat4.lookAt(viewMatrix, eyePt, centerPt, upDir);
	// vMath.mat4.identity(viewMatrix);
	// vMath.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -7.0]);
	
	var eyePt = vMath.vec3.fromValues(-37.0,1.5,22.0);
	var Camera = new glext.CCamera(0, gl.viewportWidth, gl.viewportHeight);
	Camera.setPositionAndDir(eyePt, [0.752,0.06,-0.656], upDir);
	Camera.UpdateProjectionMatrix();
	
	var CenterCamera = new glext.CCamera(1, gl.viewportWidth, gl.viewportHeight);
	vMath.mat4.identity(CenterCamera.ViewMatrix);
	CenterCamera.Position = [0.0,0.0,0.0];
	CenterCamera.ProjectionMatrix = Camera.ProjectionMatrix;
	vMath.mat4.copy(CenterCamera.ViewMatrix, Camera.ViewMatrix);
	vMath.mat4.setTranslation(CenterCamera.ViewMatrix, CenterCamera.ViewMatrix, [0.0,0.0,0.0]);
	
	vMath.mat4.identity(model.Transform);
	// vMath.mat4.scale(model.Transform, model.Transform, [4.0,4.0,4.0]);
	vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	vMath.mat4.identity(AtmoSphereModel.Transform); var atmoScale = 1.012;
	vMath.mat4.scale(AtmoSphereModel.Transform, AtmoSphereModel.Transform, [atmoScale,atmoScale,atmoScale]);
	
	vMath.mat4.identity(SkySphereModel.Transform);
	vMath.mat4.scale(SkySphereModel.Transform, SkySphereModel.Transform, [10.0,10.0,10.0]);
	vMath.mat4.rotate(SkySphereModel.Transform, SkySphereModel.Transform, vMath.deg2rad(-90.0), [1,0,0]);


	vMath.mat4.identity(navigatorModel.Transform);
	vMath.mat4.setScale(navigatorModel.Transform, navigatorModel.Transform, [10.0,10.0,10.0]);
	vMath.mat4.rotate(navigatorModel.Transform, navigatorModel.Transform, vMath.deg2rad(180), [0,1,0]);
	vMath.mat4.setTranslation(navigatorModel.Transform, navigatorModel.Transform, [ -5.0, 7.5, -15.0]);
	// glext.CFramebuffer.BindMainFB();


	vMath.mat4.identity(dderidex.models[0].Transform);
	vMath.mat4.rotate(dderidex.models[0].Transform, dderidex.models[0].Transform, vMath.deg2rad(180), [0,1,0]);
	vMath.mat4.setTranslation(dderidex.models[0].Transform, dderidex.models[0].Transform, [ -5.0, 12.5, -35.0]);
	
		
	var time = 0.0;
	sys.time.init();
	
	shader.setFlagsUniform(1);
	
	var IdentityMatrix = vMath.mat4.create();
	vMath.mat4.identity(IdentityMatrix);
	
	var MipGen = new glext.CMipMapGen();
	if((bUseHDR == false) || (bUseHDR == true && bStoreHDRinRGBA8 == true))
		MipGen.Create(gl.viewportWidth, gl.viewportHeight, gl.RGBA8, "mipmapVS", "3x3MipGenFS");
	else
		MipGen.Create(gl.viewportWidth, gl.viewportHeight, gl.RGBA16F, "mipmapVS", "3x3MipGenFS");
	
	// var Flags = 1;
	// var time_of_start = sys.time.getTimeµs();
	glext.CBlendMode.Enable();
	
	setInterval( function(){ window.requestAnimationFrame(renderFrame); }, 25);
		
	// var circularMov = [0.0, 0.0]; //azimuth, inclination
	// var distFromObject = 7.0;
	
	var orbital = [];
	orbital.radius = 7.0;
	orbital.inclination = 0.0;
	orbital.azimuth = 0.0;
	orbital.dinclination = 0.0;
	orbital.dazimuth = 0.0;
	
	var bEnableRotation = false;
	
	function renderFrame()
	{
		time = sys.time.getSecondsSinceStart();
		var ctime = Math.cos(time);
		var stime = Math.sin(time);
		var ctime10 = Math.cos(10*time);
		
		if(checkWindowsSizeAndResizeCanvas() == true){
			Camera.setViewportWidthHeight(gl.viewportWidth,gl.viewportHeight);}
		
		vMath.mat4.identity(model.Transform);
		if(bEnableRotation) vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(time*10), [0,0,1]);/*  */
			
		UpdateCamera(Camera, CenterCamera, orbital, "move");
		
		// render Color, Normal, AoRSMtEm buffera (i Depth isto)
		//-------------------------------------------------------------------------------------
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		fboDeferred.Bind();
		
		gl.clearColor(0.25, 0.5, 0.75, 1.0);
		gl.clearDepth(1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.disable(gl.DEPTH_TEST);
		RenderModels(fboDeferred, true, time, CenterCamera, [SkySphereModel]);
		gl.clear(gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		
		// RenderModels(fboDeferred, false, time, Camera, [model]);
		RenderModels(fboDeferred, false, time, Camera, galaxy.models);
		
		// RenderModels(fboDeferred, false, time, Camera, dderidex.models);
		
		light.setPosition(10.0*ctime + 2.0, 15.0, 10.0*stime + 20.0 );
		light.setDisplaySize(5.0);
		light.setDisplayColor(0.5,0.79,1.0,1.0);
		light.setMatrices( Camera.ViewMatrix, Camera.ProjectionMatrix );
		light.RenderPosition();
		light.setIntensity(917.0);
		light.setColor(0.5,0.79,1.0,1.0);
		light.Update();
		//-------------------------------------------------------------------------------------
		
		//render opaque sa pbr shaderom
		//-------------------------------------------------------------------------------------
		fboHdrMipBlur.Bind();
		fboHdrMipBlur.DetachDepth(); //kako se nebi prebrisao sa quadom
		gl.viewport(0, 0, fboHdrMipBlur.width, fboHdrMipBlur.height);
			
			gl.clearColor(0.5, 0.5, 0.5, 1.0);
			gl.clearDepth(1.0);
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			fboHdrMipBlur.ActivateDrawBuffers(deferred_opaque_shader);
			
			deferred_opaque_shader.Bind();
			
				// txfbColor.Bind(0, deferred_opaque_shader.ULTextureD);
				quad_model.BindTexturesToShader(deferred_opaque_shader);
				
				deferred_opaque_shader.setViewMatrixUniform( IdentityMatrix );
				deferred_opaque_shader.setProjectionMatrixUniform( IdentityMatrix );
				
				deferred_opaque_shader.setTimeUniform(time);
				
				deferred_opaque_shader.setCameraPositionUniform(Camera.Position);
				deferred_opaque_shader.setFloat3Uniform(deferred_opaque_shader.ULCameraForwardDir, Camera.ForwardDir);
				deferred_opaque_shader.setFloat3Uniform(deferred_opaque_shader.ULCameraRightDir, Camera.RightDir);
				deferred_opaque_shader.setFloat3Uniform(deferred_opaque_shader.ULCameraUpDir, Camera.UpDir);
				deferred_opaque_shader.setMatrix4Uniform(deferred_opaque_shader.ULInvViewProjMatrix, Camera.InverseViewProjectionMatrix);
				
				// light.UploadToShader(deferred_opaque_shader, lightUniforms_backbuffer_shader);
				
				quad_model.RenderIndexedTriangles(deferred_opaque_shader);
		
		
		fboHdrMipBlur.AttachDepth(txfbDepth); //reatachamo "spaseni" depth
		
		//atmosphere render
		//-------------------------------------------------------------------------------------
		// light.UploadToShader(atmosphere_shader, atmosphere_shader.lightUniforms);
		// RenderModels(fboHdrMipBlur, false, time, Camera, [AtmoSphereModel]);
		
		//kopiranje iz mip blur u main color buffer
		//-------------------------------------------------------------------------------------
		glext.CFramebuffer.CopyTextureFromFBColorAttachment(txfbHdrMipBlur, 0, txfbColor, 0, MipGen.framebuffer, true);
				
		//gen mipmapa za blured glow
		//-------------------------------------------------------------------------------------
		glext.CFramebuffer.CopyTextureFromFBColorAttachment(txfbHdrMipBlur2, 0, txfbAoRSMt, 0, MipGen.framebuffer, true);
		MipGen.Generate(txfbHdrMipBlur2);
		
		//integriranje blured glowa u main txfbHdrMipBlur
		//-------------------------------------------------------------------------------------
		fboGlowIntegrate.Bind();
			
			gl.clearColor(0.5, 0.5, 0.5, 1.0);
			gl.clearDepth(1.0);
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			
			fboGlowIntegrate.ActivateDrawBuffers(glow_integrate_shader);
			
			glow_integrate_shader.Bind();
			
				quad_model.BindTexturesToShader(glow_integrate_shader);
				
				txfbHdrMipBlur.Bind(0, glow_integrate_shader.ULColor);
				txfbHdrMipBlur2.Bind(1, glow_integrate_shader.ULGlow);
				
				glow_integrate_shader.setViewMatrixUniform( IdentityMatrix );
				glow_integrate_shader.setProjectionMatrixUniform( IdentityMatrix );
				
				glow_integrate_shader.setTimeUniform(time);
				
				glow_integrate_shader.setCameraPositionUniform(Camera.Position);
				glow_integrate_shader.setFloat3Uniform(glow_integrate_shader.ULCameraForwardDir, Camera.ForwardDir);
				glow_integrate_shader.setFloat3Uniform(glow_integrate_shader.ULCameraRightDir, Camera.RightDir);
				glow_integrate_shader.setFloat3Uniform(glow_integrate_shader.ULCameraUpDir, Camera.UpDir);
				glow_integrate_shader.setMatrix4Uniform(glow_integrate_shader.ULInvViewProjMatrix, Camera.InverseViewProjectionMatrix);
				
				quad_model.RenderIndexedTriangles(glow_integrate_shader);
				
		glext.CFramebuffer.BindMainFB();	
		//-------------------------------------------------------------------------------------
		
		//gen mipmapa za renderirani color buffer
		//-------------------------------------------------------------------------------------
		MipGen.Generate(txfbHdrMipBlur);
		
		//rendanje transparentnih modela
		//-------------------------------------------------------------------------------------
		gl.viewport(0, 0, txfbColor.width, txfbColor.height);
		fboTransparent.Bind();
		
			// fbo.AttachTexture(txfbColor, 0);
			// RenderModels(fboTransparent, false, time, Camera, [navigatorModel]);
			RenderModels(fboTransparent, false, time, Camera, dderidex.models);
		
		
		//render to main FB, sa shaderom koji prikazuje mipove.
		//-------------------------------------------------------------------------------------
		glext.CFramebuffer.BindMainFB();	
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		
		backbuffer_shader.Bind();
		
			// guad_model.BindTexturesToShader(backbuffer_shader);
			txfbColor.Bind(0, backbuffer_shader.ULTextureD);
			
			backbuffer_shader.setViewMatrixUniform( IdentityMatrix );
			backbuffer_shader.setProjectionMatrixUniform( IdentityMatrix );
			backbuffer_shader.setTimeUniform(time);
			backbuffer_shader.setCameraPositionUniform(Camera.Position);
			
			quad_model.RenderIndexedTriangles(backbuffer_shader);
		
		sys.mouse.Update();
		sys.keyboard.Update();
		gl.flush();
		gs.Update();
	}
	
	return; /* */
}

function RenderModels(fbo, bClearFBO, time, camera, models){
	
	if(fbo != null){
		fbo.Bind();
		gl.viewport(0, 0, fbo.width, fbo.height);
	}
	
	if(bClearFBO == true){ gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);}
	
	for(var m = 0; m < models.length; ++m){
		var model = models[m];
		var shader = glext.CShaderList.get(model.shaderID);
		
		if(fbo != null) fbo.ActivateDrawBuffers(shader);
		
		shader.Bind();
		
			model.BindTexturesToShader(shader);
		
			shader.setViewMatrixUniform( camera.ViewMatrix );
			shader.setProjectionMatrixUniform( camera.ProjectionMatrix );
			shader.setCameraPositionUniform(camera.Position);
			shader.setTimeUniform(time);
			
			model.RenderIndexedTriangles(shader);
	}
}

function UpdateCamera(Camera, CenterCamera, orbital, mode){
				
	//Calc camera view i proj
	//-------------------------------------------------------------------------------------
	let bUpdateCamera = false;
	
	let mousePos = sys.mouse.getPosition();
	let mouseDelta = sys.mouse.getDeltaPosition();
	let moveDir = [0.0,0.0,0.0];
	let tilt = 0.0;
	
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
	
	if(sys.keyboard.isKeyPressed("w") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.ForwardDir,  1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("s") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.ForwardDir, -1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("a") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.RightDir, -1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("d") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.RightDir,  1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("f") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.UpDir, -1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("r") != false){
		vMath.vec3.scaleAndAdd(moveDir, moveDir, Camera.UpDir,  1.0/orbital.radius); bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("q") != false){
		tilt += -0.25/orbital.radius; bUpdateCamera = true; }
	if(sys.keyboard.isKeyPressed("e") != false){
		tilt += 0.25/orbital.radius; bUpdateCamera = true; }
	
	if(mode == "orbital"){
		if(bUpdateCamera == true)
		{
			let RightAdd = vMath.vec3.create();
			let UpAdd = vMath.vec3.create();
			
			let sinA = Math.sin(vMath.deg2rad(orbital.dazimuth)); let sinI = Math.sin(vMath.deg2rad(orbital.dinclination));
			vMath.vec3.scale(RightAdd, Camera.RightDir, orbital.radius * sinA);
			vMath.vec3.scale(UpAdd, Camera.UpDir, orbital.radius * sinI);
			vMath.vec3.add(Camera.Position, Camera.Position, RightAdd);
			vMath.vec3.add(Camera.Position, Camera.Position, UpAdd);
			
			vMath.vec3.normalize(Camera.Position, Camera.Position);
			vMath.vec3.scale(Camera.Position, Camera.Position, orbital.radius);
			
			Camera.setPositionAndLookPt(Camera.Position, [0.0,0.0,0.0], Camera.UpDir);
			Camera.CalcInverseViewProjectionMatrix();
			
			vMath.mat4.copy(CenterCamera.ViewMatrix, Camera.ViewMatrix);
			vMath.mat4.setTranslation(CenterCamera.ViewMatrix, CenterCamera.ViewMatrix, [0.0,0.0,0.0]);
		}
	}
	else if(mode == "move"){
		if(bUpdateCamera == true)
		{
			vMath.vec3.add(Camera.Position, Camera.Position, moveDir);
			
			let RightAdd = vMath.vec3.create();
			let UpAdd = vMath.vec3.create();
			
			let sinA = -Math.sin(vMath.deg2rad(orbital.dazimuth)); let sinI = -Math.sin(vMath.deg2rad(orbital.dinclination));
			
			Camera.Rotate(0.1*sinA, 0.1*sinI);
			Camera.Tilt(0.1*tilt);
			Camera.UpdateViewMatrix();
			Camera.CalcInverseViewProjectionMatrix();
			
			vMath.mat4.copy(CenterCamera.ViewMatrix, Camera.ViewMatrix);
			vMath.mat4.setTranslation(CenterCamera.ViewMatrix, CenterCamera.ViewMatrix, [0.0,0.0,0.0]);
		}
	}
	
	/*
	if(sys.mouse.get().btnLeft == true)
		if(sys.mouse.get().dx != 0 || sys.mouse.get().dy != 0){
			Camera.Rotate(sys.mouse.get().dx / 100.0, sys.mouse.get().dy / 100.0);
			Camera.CalcInverseViewProjectionMatrix();
		} 
	*/
	//-------------------------------------------------------------------------------------
}

export function recompileShader(fragment_name){
	if(gl == null) return;
	
	for(var i = 0; i < glext.CShaderList.count(); ++i)
	{
		var shader = glext.CShaderList.get(i);
		if(shader.FragmentShaderName == fragment_name)
		{
			shader.Recompile();
			shader.InitDefaultAttribLocations();
			shader.InitDefaultUniformLocations();
			
			switch(fragment_name){
				case "transparent_shader":
					shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
					shader.ULTextureBackground = shader.getUniformLocation("txBackground");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "deferred_opaque_shader":
					shader.ULInvViewProjMatrix = shader.getUniformLocation("InverseViewProjectionMatrix");
					shader.ULCameraForwardDir = shader.getUniformLocation("CameraForwardDir");
					shader.ULCameraRightDir = shader.getUniformLocation("CameraRightDir");
					shader.ULCameraUpDir = shader.getUniformLocation("CameraUpDir");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "glow_integrate_shader":
					shader.ULInvViewProjMatrix = shader.getUniformLocation("InverseViewProjectionMatrix");
					shader.ULCameraForwardDir = shader.getUniformLocation("CameraForwardDir");
					shader.ULCameraRightDir = shader.getUniformLocation("CameraRightDir");
					shader.ULCameraUpDir = shader.getUniformLocation("CameraUpDir");
					shader.ULColor = shader.getUniformLocation("txColor");
					shader.ULGlow = shader.getUniformLocation("txGlow");
				break;
				case "deferred_BcNAoRSMt":
					shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
				break;
				case "atmosphere_shader":
					// shader.lightUniforms = glext.CLight.getUniformLocationsFromShader(shader, "light0");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				default: break;
			}
			
			break;
		}
	}	
}


export function reloadTexture(texture_name){
	if(gl == null) return;
	
	for(var i = 0; i < glext.CTextureList.count(); ++i)
	{
		var texture = glext.CTextureList.get(i);
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