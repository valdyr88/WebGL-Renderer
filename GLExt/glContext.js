
var gl = null; // A global variable for the WebGL context
var glContextName = "";
// var glExtensions = [];
// var isWGL2 = false;
var debug_text_dom = null;

/*
default extensions:
	 glext.glEnableExtension('OES_texture_float');
	 glext.glEnableExtension('OES_texture_float_linear');
	 glext.glEnableExtension('EXT_shader_texture_lod');
*/

//====================================================================================================
//GL init
//====================================================================================================
function glInitWebGLContext(canvas){
	gl = null;
	
	var contextNames = ["webgl2", "webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
	
	for(var i = 0; i < contextNames.length; ++i){
		try{// Try to grab the context.
			gl = canvas.getContext(contextNames[i]);
			gl.windowCanvas = canvas;
			glContextName = contextNames[i];
			gl.contextName = glContextName;
			
			if(glContextName == "webgl2")
				gl.isWGL2 = true;
			else
				gl.isWGL2 = false;
		
            gl.viewportWidth = canvas.width;
            gl.viewportHeight = canvas.height;
			
			gl.currentShaderProgram = -1;
			gl.currentFramebuffer = -1;
			gl.enabledExtensions = [];
		}
		catch(e){ continue; }
		if(gl != null) break;
	}
	
	if(gl == null){// If we don't have a GL context, give up now
		alert("Unable to initialize WebGL. Your browser may not support it.");
		return null;
	}
	
	// if(glContextName == "webgl2")
		// isWGL2 = true;
	
	return gl;
}

export function glEnableExtension(extension_name){
	if(gl == null) return false;
	var ext = gl.getExtension(extension_name);
	if(ext == null) return false;
	gl.enabledExtensions[gl.enabledExtensions.length] = ext;
}

export function glPrintError(){
	
	var errorID = gl.getError();
	switch(errorID)
	{
		case gl.NO_ERROR:
			
			break;
		case gl.INVALID_ENUM:
			alert("WebGL: INVALID_ENUM");
			break;
		case gl.INVALID_VALUE:
			alert("WebGL: INVALID_VALUE");
			break;
		case gl.INVALID_OPERATION:
			alert("WebGL: INVALID_OPERATION");
			break;
		case gl.INVALID_FRAMEBUFFER_OPERATION:
			alert("WebGL: INVALID_FRAMEBUFFER_OPERATION");
			break;
		case gl.OUT_OF_MEMORY:
			alert("WebGL: OUT_OF_MEMORY");
			break;
		case gl.CONTEXT_LOST_WEBGL:
			alert("WebGL: CONTEXT_LOST_WEBGL");
			break;
		default:
			alert("WebGL: unknown error");
			break;
	}	
}

export function glInit(canvasID) {
	var canvas = document.getElementById(canvasID);//"glcanvas"
	
	gl = glInitWebGLContext(canvas);			// Initialize the GL context
	
	// Only continue if WebGL is available and working
	if(gl){
		// gl.clearColor(0.0, 0.0, 0.0, 1.0);// Set clear color to black, fully opaque
		// gl.enable(gl.DEPTH_TEST);// Enable depth testing
		// gl.depthFunc(gl.LEQUAL);// Near things obscure far things
		// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Clear the color as well as the depth buffer.
		return gl;
	}
	return null;
}

export function ResizeCanvas(width, height){
	gl.windowCanvas.width = width;
	gl.windowCanvas.height = height;

	gl.viewportWidth = gl.windowCanvas.width;
	gl.viewportHeight = gl.windowCanvas.height;
}

export function InitDebugTextDOM(objID){
	debug_text_dom = document.getElementById(objID);
	if(debug_text_dom == null) alert("InitDebug() null : " + objID);
}

export function WriteDebug(str){
	if(debug_text_dom != null){
		// debug_text_dom.text = str;
		debug_text_dom.innerHTML = str;
		debug_text_dom.style.display = "inline";
	}
}


//====================================================================================================

export function getContentsFromFile(id){
		var shaderScript = document.getElementById(id);
		if(shaderScript == null) return null;
		
		var source = "";
		var k = shaderScript.firstChild;
		
		if(k != null){
			while(k){
				if(k.nodeType == 3){ source += k.textContent; }
				k = k.nextSibling; }
		}
		else if(shaderScript.text != null){
			source = shaderScript.text;
		}
		else{ return null; }
		
		return source;
	}

export {gl, glContextName}; //isWGL2
// export { glInit };