import * as glext from "./GLExt/GLExt.js"
import * as sys from "./System/sys.js"
import * as vMath from "./glMatrix/gl-matrix.js"

var gl = null;

export function main(){
	
	var gs = sys.storage.CGlobalStorage.getSingleton();
	
	gl = glext.glInit("glcanvas");
		 if(glext.isWGL2 && glext.glEnableExtension('OES_texture_float') == false) alert("no extension: OES_texture_float");
		 if(glext.isWGL2 && glext.glEnableExtension('EXT_shader_texture_lod') == false) alert("no extension: EXT_shader_texture_lod");
		 if(glext.glEnableExtension('OES_texture_float_linear') == false) alert("no extension: OES_texture_float_linear");
	if(gl == null) return;
	
	gl.clearColor(0.0, 1.0, 1.0, 1.0);
	gl.blendColor(1.0, 1.0, 1.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.BLEND);
	gl.clearDepth(1.0); 
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.frontFace(gl.CCW);
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	
	gl.disable(gl.BLEND);
	gl.depthFunc(gl.LESS);
	// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.blendFunc(gl.ONE, gl.ZERO);
	
	var shader = new glext.CShader(0);
	if(shader.CompileFromFile("simpleVS", "pbr_shader") == false) alert("nije kompajliran shader!");
	shader.setVertexAttribLocations("aVertexPosition","aVertexNormal","aVertexTangent",null,"aTexCoords");
	shader.setTransformMatricesUniformLocation("ModelMatrix","ViewMatrix","ProjectionMatrix");
	shader.setDefaultTextureUniformLocations("txDiffuse","txNormal","txAoRS");
	shader.setBRDFLUTTextureUniformLocation("txBRDF");
	shader.setFlagsUniformLocation("uFlags");
	shader.setTimeUniformLocation("Time");
	shader.setCameraPositionUniformLocation("CameraPosition");
	
	shader.ULTextureAmb = shader.getUniformLocation("txAmbient");
	
	var skybox_shader = new glext.CShader(0);
	if(skybox_shader.CompileFromFile("simpleVS", "skybox_shader") == false) alert("nije kompajliran shader!");
	skybox_shader.ULTextureAmb = skybox_shader.getUniformLocation("txAmbient");
	skybox_shader.InitDefaultUniformLocations();
	skybox_shader.InitDefaultAttribLocations();
	
	var backbuffer_shader = new glext.CShader(0);
	if(backbuffer_shader.CompileFromFile("simpleVS", "backbuffer_shader") == false) alert("nije kompajliran shader!");
	backbuffer_shader.InitDefaultAttribLocations();
	backbuffer_shader.InitDefaultUniformLocations();
	
	var SphereModel = new glext.CModel(0);
	SphereModel.ImportFrom("SphereModel");
	// setupCubeModel(model);
	
	var model = new glext.CModel(1);
	model.ImportFrom("navigatorModel");
	
	var quad_model = new glext.CModel(2);
	setupQuadModel(quad_model);
	
	var txBRDF_LUT = new glext.CTexture(3); txBRDF_LUT.CreateFromFile("txBRDF_LUT");
	txBRDF_LUT.setWrapTypeClampToEdge();
	
	var txD = new glext.CTexture(0); txD.CreateFromFile("txRock_D");
	var txN = new glext.CTexture(1); txN.CreateFromFile("txRock_N");
	var txAoRS = new glext.CTexture(2); txAoRS.CreateFromFile("txRock_AoRS");
	
	var txAmb = new glext.CTextureCube(0); txAmb.CreateFromDOMDataElements("tx128");
	
	var light = new glext.CLight(-1);
	var lightUniforms = light.getUniformLocationsFromShader(shader,"light0");
	
	var projectionMatrix = vMath.mat4.create();
	var viewMatrix = vMath.mat4.create();
	
	var eyePt = vMath.vec3.fromValues(-7.0,0.0,0.0);
	var centerPt = vMath.vec3.fromValues(0.0,0.0,0.0);
	var upDir = vMath.vec3.fromValues(0.0,0.0,1.0);
	
	//framebuffer
	//------------------------------------------------------------------------
	var fbo_width = 640; var fbo_height = 480;
	var txfbColor = new glext.CTexture(4); txfbColor.CreateEmptyRGBAubyte(fbo_width,fbo_height);
	var txfbDepth = new glext.CTexture(5); txfbDepth.CreateEmptyDepthfloat(fbo_width,fbo_height);
	var fbo = new glext.CFramebuffer(0);   fbo.Create(); fbo.AttachTexture(txfbColor, 0); fbo.AttachDepth(txfbDepth);
	//------------------------------------------------------------------------
	
	vMath.mat4.perspective(projectionMatrix, vMath.deg2rad(40.0), gl.viewportWidth/gl.viewportHeight, 0.1, 1000.0);
	
	vMath.mat4.lookAt(viewMatrix, eyePt, centerPt, upDir);
	// vMath.mat4.identity(viewMatrix);
	// vMath.mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -7.0]);
	
	vMath.mat4.identity(model.Transform);
	// vMath.mat4.scale(model.Transform, model.Transform, [4.0,4.0,4.0]);
	vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	vMath.mat4.identity(SphereModel.Transform);
	vMath.mat4.scale(SphereModel.Transform, SphereModel.Transform, [10.0,10.0,10.0]);
	vMath.mat4.rotate(SphereModel.Transform, SphereModel.Transform, vMath.deg2rad(-90.0), [1,0,0]);
	
	var time = 0.0;
	sys.time.init();
	
	shader.setFlagsUniform(1);
	
	var IdentityMatrix = vMath.mat4.create();
	vMath.mat4.identity(IdentityMatrix);
	
	// var Flags = 1;
	// var time_of_start = sys.time.getTimeµs();
	
	//kugla i ambient iscrtani na texturi i kasnije iscrtani na glavni fb preko quada
	setInterval(
		function(){
			// time = time + 0.25;
			time = sys.time.getSecondsSinceStart();
			var ctime = Math.cos(time);
			var stime = Math.sin(time);
			
			var ctime10 = Math.cos(10*time);
			
			// eyePt[0] = 20*ctime;
			// eyePt[1] = 20*stime;
			
			vMath.mat4.identity(model.Transform);
			vMath.mat4.rotate(model.Transform, model.Transform, vMath.deg2rad(time*10), [0,0,1]);/*  */
			
			skybox_shader.Bind();
			txD.Bind(0, skybox_shader.ULTextureD);
			
			fbo.Bind();
			gl.viewport(0, 0, fbo.width, fbo.height);
				
				gl.clearColor(0.25, 0.5, 0.75, 1.0);
				gl.clearDepth(1.0);
				gl.enable(gl.DEPTH_TEST);
				gl.depthFunc(gl.LEQUAL);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				
				
				skybox_shader.Bind();
				
					txAmb.Bind(3, skybox_shader.ULTextureAmb);
					
					skybox_shader.setViewMatrixUniform( viewMatrix );
					skybox_shader.setProjectionMatrixUniform( projectionMatrix );
					
					skybox_shader.setTimeUniform(time);
					
					skybox_shader.setCameraPositionUniform(eyePt);
					
					SphereModel.RenderIndexedTriangles(skybox_shader);
					
				
				light.setPosition(-2.0*ctime, 2.0, 2.0);
				light.setDisplaySize(5.0);
				light.setDisplayColor(1.0, 1.0, 0.0, 1.0);
				light.setMatrices( viewMatrix, projectionMatrix );
				light.RenderPosition();
				
				
				shader.Bind();
				
					txD.Bind(0, shader.ULTextureD);
					txN.Bind(1, shader.ULTextureN);
					txAoRS.Bind(2, shader.ULTextureAoRS);
					txAmb.Bind(3, shader.ULTextureAmb);
					txBRDF_LUT.Bind(4, shader.ULTextureBRDF_LUT);
					
					shader.setViewMatrixUniform( viewMatrix );
					shader.setProjectionMatrixUniform( projectionMatrix );
					
					shader.setTimeUniform(time);
					
					shader.setCameraPositionUniform(eyePt);
					
					// if(ctime10 > 0) shader.setFlagsUniform(4);
					// else shader.setFlagsUniform(0);
					
					light.UploadToShader(shader, lightUniforms);
					
					model.RenderIndexedTriangles(shader);
				
				// shader.Unbind();
				
			
			glext.CFramebuffer.BindMainFB();	
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);		
				
				gl.clearColor(0.5, 0.5, 0.5, 1.0);
				gl.clearDepth(1.0);
				gl.enable(gl.DEPTH_TEST);
				gl.depthFunc(gl.LEQUAL);
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
				
				backbuffer_shader.Bind();
				
					txfbColor.Bind(0, backbuffer_shader.ULTextureD);
					
					backbuffer_shader.setViewMatrixUniform( IdentityMatrix );
					backbuffer_shader.setProjectionMatrixUniform( IdentityMatrix );
					
					backbuffer_shader.setTimeUniform(time);
					
					// backbuffer_shader.setCameraPositionUniform(eyePt);
					
					quad_model.RenderIndexedTriangles(backbuffer_shader);
			
			// gl.flush();
			gs.Update();
	}, 25);
}

function setupCubeModel(model)
{
	model.VertexBuffer = [
				// Front face
				[-1.0, -1.0,  1.0],
				[ 1.0, -1.0,  1.0],
				[ 1.0,  1.0,  1.0],
				[-1.0,  1.0,  1.0],

				// Back face
				[-1.0, -1.0, -1.0],
				[-1.0,  1.0, -1.0],
				[ 1.0,  1.0, -1.0],
				[ 1.0, -1.0, -1.0],

				// Top face
				[-1.0,  1.0, -1.0],
				[-1.0,  1.0,  1.0],
				[ 1.0,  1.0,  1.0],
				[ 1.0,  1.0, -1.0],

				// Bottom face
				[-1.0, -1.0, -1.0],
				[ 1.0, -1.0, -1.0],
				[ 1.0, -1.0,  1.0],
				[-1.0, -1.0,  1.0],

				// Right face
				[ 1.0, -1.0, -1.0],
				[ 1.0,  1.0, -1.0],
				[ 1.0,  1.0,  1.0],
				[ 1.0, -1.0,  1.0],

				// Left face
				[-1.0, -1.0, -1.0],
				[-1.0, -1.0,  1.0],
				[-1.0,  1.0,  1.0],
				[-1.0,  1.0, -1.0],
			  ];
	model.VertexBuffer.itemSize = 3;
	
	model.NormalBuffer = [
				// Front face
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],
				[ 0.0,  0.0,  1.0],

				// Back face
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],
				[ 0.0,  0.0, -1.0],

				// Top face
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],
				[ 0.0,  1.0,  0.0],

				// Bottom face
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],
				[ 0.0, -1.0,  0.0],

				// Right face
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],
				[ 1.0,  0.0,  0.0],

				// Left face
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
				[-1.0,  0.0,  0.0],
			  ];
	model.NormalBuffer.itemSize = 3;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
			4,  5,  6,      4,  6,  7,    // back
			8,  9,  10,     8,  10, 11,   // top
			12, 13, 14,     12, 14, 15,   // bottom
			16, 17, 18,     16, 18, 19,   // right
			20, 21, 22,     20, 22, 23,   // left
		  ];

	model.VertexType = "vn";
	model.CreateBuffers();
}

function setupQuadModel(model)
{
	model.VertexBuffer = [
				// Front face
				[-1.0, -1.0,  1.0],
				[ 1.0, -1.0,  1.0],
				[ 1.0,  1.0,  1.0],
				[-1.0,  1.0,  1.0],
				
			];
	model.VertexBuffer.itemSize = 3;
	
	model.TexCoordBuffer = [
				// Front face
				[ 0.0,  0.0],
				[ 1.0,  0.0],
				[ 1.0,  1.0],
				[ 0.0,  1.0],
			];
	model.TexCoordBuffer.itemSize = 2;
	
	model.IndexBuffer = [
			0,  1,  2,      0,  2,  3,    // front
		  ];

	model.VertexType = "vt";
	model.CreateBuffers();
}