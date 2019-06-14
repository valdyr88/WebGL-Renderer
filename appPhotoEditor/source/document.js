import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js";

import { CLayer, CRasterLayer, CVectorLayer } from "./layer.js";

class CLayerRenderer{
	
	/*
		
	*/
	
	constructor(){
		this.framebuffer = new glext.CFramebuffer(false); this.framebuffer.Create();
		this.quad_model = new glext.CModel(-1);
		glext.GenQuadModel(this.quad_model);
	}
	
	RenderLayer(shader){
		
	}
}

export class CDocument{
	
	constructor(id){
		++CDocument.createdCount;
		
		if(id != null){
			this.htmlObj = document.getElementById(id);
			this.id = id;
		}
		else{
			this.htmlObj = null;
			this.id = "document_file_" + CDocument.createdCount.toString();
		}
		
		this.layers = [];
		// this.canvas = CanvasHandler.CreateHandle();
		this.editingID = 0; //id layera u listi layers koji se trenutno editira
	}
	
	CollapseForDisplay(){
		//collapsat layere od 0 - editingID-1 u donju teksturu, a editingID+1 do layers.length-1 u gornju.
	}
	
	CreateNew(w, h){
		sys.html.CreateDOMFromHTMLFile(this, "./windows/document.html", function(callee, obj){
			callee.htmlObj = document.createElement('div');
			callee.htmlObj.id = callee.id;
			callee.htmlObj.appendChild(obj);
			
			document.body.appendChild(callee.htmlObj);
			
			callee.htmlObj.style.position = "absolute";
			// callee.htmlObj.onclick = document.window.document_onclick(callee.id);
			callee.htmlObj.onclick = callee.AttachGLCanvas;
			sys.html.MakeElementMovable(callee.htmlObj, "data-movable-element-handle");
		});
	}
	
	//ToDo: zIndex ne radi
	AttachGLCanvas(){
		var docObj = this;
		var gl = glext.gl;
		if(gl == null) return;
		if(gl.activeDoc === docObj) return;
		
		var obj = sys.utils.getGrandchild(docObj, ["panelmain","divA","divB","document_paint_area"]);
		var objtwo = gl.canvasObject.parentNode;
		var objtwoChildPos = sys.utils.getChildPosition(objtwo, "document_paint_canvas");
		var oldCanvasObject = sys.utils.getChild(obj, "document_paint_canvas");
		var doctwo = sys.utils.getGrandparent(gl.canvasObject, ["document_paint_area","divB","divA","panelmain"]);
		
		//replaceChild( new, old );
		obj.replaceChild(gl.canvasObject, oldCanvasObject);
		if(objtwoChildPos != -1) objtwo.insertBefore(oldCanvasObject, objtwo.children[objtwoChildPos]);
			
		//add mous functions to paint document object
		docObj.baseWindowOffset = [gl.canvasObject.offsetLeft, gl.canvasObject.offsetTop];
		
		docObj.transformMouseCoords = function(pos){
			pos[0] = pos[0] - this.baseWindowOffset[0];
			pos[1] = pos[1] - this.baseWindowOffset[1];
		}
		
		gl.activeDoc = docObj;
		
		//set to front
		docObj.style.zIndex = 1;
		//set to back
		doctwo.style.zIndex = -1;
	}
}

CDocument.createdCount = 0;