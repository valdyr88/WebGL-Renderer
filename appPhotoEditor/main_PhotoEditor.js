import * as glext from "./../GLExt/GLExt.js"
import * as sys from "./../System/sys.js"
import * as vMath from "./../glMatrix/gl-matrix.js";
import * as img from "./source/layer.js";
import * as brush from "./source/brush.js";

var gl = null;

export function main()
{
	document.addEventListener('contextmenu', event => event.preventDefault());
	
	var gs = sys.storage.CGlobalStorage.getSingleton();
	sys.mouse.InitMouse(document);
	sys.keyboard.InitKeyboard(document);
		
	gl = glext.glInit("document_paint_canvas");
	if(gl == null) return;
	
		 if(gl.isWGL2 == false && glext.glEnableExtension('OES_texture_float') == false) alert("no extension: OES_texture_float");
		 if(gl.isWGL2 == false && glext.glEnableExtension('EXT_shader_texture_lod') == false) alert("no extension: EXT_shader_texture_lod");
		 if(glext.glEnableExtension('EXT_color_buffer_float') == false) alert("no extension: EXT_color_buffer_float");
		 if(glext.glEnableExtension('OES_texture_float_linear') == false) alert("no extension: OES_texture_float_linear");
		
	glext.InitDebugTextDOM("debug_text");
	
	glext.InitNDCQuadModel();
	
	var doc = document.getElementById("documentfile");
	var doc_paint_canvas = document.getElementById("document_paint_canvas");
	doc_paint_canvas.baseWindowOffset = [gl.canvasObject.offsetLeft, gl.canvasObject.offsetTop];
	
	var label_Debug = document.getElementById("label_Debug");
	
	doc_paint_canvas.transformMouseCoords = function(pos){
		pos[0] = pos[0] - this.baseWindowOffset[0];
		pos[1] = pos[1] - this.baseWindowOffset[1];
	}
	
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
	
	glext.CBlendMode.Init();
		
	// glext.CShaderDefines.addGlobalDefine("MAX_LIGHTS", " "+glext.MAX_LIGHTS);

	var projectionMatrix = vMath.mat4.create();
	var viewMatrix = vMath.mat4.create();
	
	var time = 0.0;
	sys.time.init();
	
	var oldframe_time = -1.0;
	var avg_frame_time = 1.0/60.0;
	var FPSlabel = document.getElementById("label_FPS");
		
	glext.CBlendMode.Enable();
	
	var layer = new img.CPaintableRasterLayer(gl.viewportWidth, gl.viewportHeight, "byte", "rgb");
	var shader = new glext.CShader(-1);
	if(shader.CompileFromFile("simpleVS", "baseBrushFS") == false) alert("nije kompajliran shader!");
	shader.InitDefaultUniformLocations();
	shader.InitDefaultAttribLocations();
	shader.BindUniforms = function(){
		// this.ULTime = time;
	}
	shader.UpdateUniforms = function(){
		this.setFloatUniform(this.ULTime, time);
	}
	
	var main_shader = new glext.CShader(-1);
	if(main_shader.CompileFromFile("simpleVS", "mainFS") == false) alert("nije kompajliran shader!");
	main_shader.InitDefaultUniformLocations();
	main_shader.InitDefaultAttribLocations();
	
	var abrush = new brush.CBrush();
	abrush.AttachUniformBlockTo(shader);
	
	var bBtnLeft = false;
	
	setInterval( function(){ window.requestAnimationFrame(renderFrame); }, 17);
	
	function renderFrame()
	{
		time = sys.time.getSecondsSinceStart();
		var frame_time = time - oldframe_time;
		
		var avg_FPS = 1.0 / avg_frame_time;
		
		if(oldframe_time > 0.0 && frame_time > 1.0 / 70.0){
			avg_frame_time = vMath.lerp(avg_frame_time, frame_time, 1.0 / 30.0);
			avg_FPS = 1.0 / avg_frame_time;
		}
		
		//ToDo: popravit ovo sa misem, ne radi down/up detekcija dobro. i smislit kako imat vise gl.canvasObject-a.
		doc_paint_canvas.baseWindowOffset = [gl.canvasObject.offsetLeft + doc.offsetLeft, gl.canvasObject.offsetTop + doc.offsetTop];
		
		var mousePos = sys.mouse.getPosition();
		var mouseDelta = sys.mouse.getDeltaPosition();
		
		if(sys.mouse.get().bLeftDown == true)
			bBtnLeft = true;
		if(sys.mouse.get().bLeftUp == true)
			bBtnLeft = false;
		doc_paint_canvas.transformMouseCoords(mousePos);
				
		if(bBtnLeft == true){
			abrush.setPosition([mousePos[0] / 500.0,1.0 - mousePos[1] / 500.0]);
			abrush.setColor(Math.cos(time)*0.5+0.5, Math.sin(time)*0.5+0.5, 1.0-Math.sin(time)*0.5+0.5);
			abrush.setDeltaTime(avg_frame_time);
			abrush.setTime(time);
		}
		else if(sys.mouse.get().bLeftUp == true){
			abrush.setColor(0.0,0.0,0.0,0.0);
		}
		abrush.Update();
		
		FPSlabel.textContent = Number.parseFloat(avg_FPS).toFixed(2) + " FPS";
		label_Debug.textContent = "mouse: [" + mousePos[0] + ", " + mousePos[1] + "], " + bBtnLeft;
				
			layer.Begin(shader);
			layer.Draw();
			layer.End();
			
		let txCopy = layer.CloneTexture();
		
		glext.CFramebuffer.BindMainFB();	
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
		
		main_shader.Bind();
			txCopy.Bind(0, main_shader.txDiffuse);
			glext.NDCQuadModel.RenderIndexedTriangles(main_shader);
		
		sys.mouse.Update();
		sys.keyboard.Update();
		gl.flush();
		gs.Update();
		
		txCopy.Delete();
		txCopy = null;
		
		oldframe_time = time;
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
	
	for(var i = 0; i < glext.CShaderList.count(); ++i)
	{
		var shader = glext.CShaderList.get(i);
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
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "deferred_opaque_shade":
					shader.ULInvViewProjMatrix = shader.getUniformLocation("InverseViewProjectionMatrix");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "deferred_BcNAoRSMt":
					shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
				break;
				case "atmosphere_shader":
					// shader.lightUniforms = glext.CLight.getUniformLocationsFromShader(shader, "light0");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
				break;
				case "volume_clouds_shader":
					shader.ULTextureNoiseRGB = shader.getUniformLocation("txNoiseRGB");
					shader.ULTextureBackground = shader.getUniformLocation("txBackground");
					glext.CLightList.get(0).AttachUniformBlockTo(shader);
					// shader.ULInverseViewMatrix = shader.getUniformLocation("InverseViewMatrix");
					shader.ULCameraForward = shader.getUniformLocation("CameraForward");
					shader.ULCameraRight = shader.getUniformLocation("CameraRight");
					shader.ULCameraUp = shader.getUniformLocation("CameraUp");
					shader.ULMouse = shader.getUniformLocation("CMouse");
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

export function onShaderDefineChanged(shader_name, select_element_id, default_value, additional_define){
	var select_element = document.getElementById(select_element_id);
	if(select_element == null) return;
	
	var shaders = glext.CShaderList.getAllWithName(shader_name);
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






