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
			//ToDo: init width/height from htmlObj
			this.width = 0;
			this.height = 0;
		}
		else{
			this.htmlObj = null;
			this.id = "document_file_" + CDocument.createdCount.toString();
			this.width = 0;
			this.height = 0;
		}
		
		this.layers = [];
		// this.canvas = CanvasHandler.CreateHandle();
		this.editingID = 0; //id layera u listi layers koji se trenutno editira
		
		this.paintCanvas = null;
		this.parentCDocument = null;
		
		this.activeLayerID = 0;
	}
	
	CollapseForDisplay(){
		//collapsat layere od 0 - editingID-1 u donju teksturu, a editingID+1 do layers.length-1 u gornju.
	}
	
	CreateLayerExt(type, w, h){
		if(type == "raster"){ this.layers[this.layers.length] = new CRasterLayer(w, h); } else
		if(type == "vector"){ this.layers[this.layers.length] = new CVectorLayer(w, h); }
	}
	
	CreateLayer(type){
		this.CreateLayerExt(type, this.width, this.height); }
	
	getDOM(){ return this.htmlObj; }
	
	setSize(w, h){
		let sizeobj = sys.utils.getGrandchild(this.htmlObj, CDocument.ids_to_size);
		sizeobj.style.width = (w + 32).toString() + "px";
		sizeobj.style.height = (h + 32).toString() + "px";
		this.width = w;
		this.height = h;
	}
	
	CreateNew(w, h){
		
		this.width = w;
		this.height = h;
		
		//load html file and create dom elements from it (callback function)
		sys.html.CreateDOMFromHTMLFile(this, "./windows/document.html", function(_this, obj){
			_this.htmlObj = document.createElement('div');
			_this.htmlObj.id = _this.id;
			_this.htmlObj.appendChild(obj);
			_this.htmlObj.parentCDocument = _this;
		
			_this.setSize(w, h);
			
			document.body.appendChild(_this.htmlObj);
			
			_this.htmlObj.style.position = "absolute";
			// _this.htmlObj.onclick = document.window.document_onclick(_this.id);
			_this.htmlObj.onclick = _this.AttachGLCanvas;
			sys.html.MakeElementMovable(_this.htmlObj, "data-movable-element-handle");
		});
	}
	
	getActivePaintLayer(){ return this.layers[this.activeLayerID].getPaintLayer(); }
	
	AttachGLCanvas(){
		//this function operates on htmlObj from CDocument
		let gl = glext.gl;
		if(gl == null) return;
		// assert(CDocuments.Count() != 0);
		if(CDocuments.getActive() === this.parentCDocument) return;
		
		if(CDocuments.Count() > 1){
			
			let obj = sys.utils.getGrandchild(this, CDocument.ids_to_paint_area);
			let objtwo = gl.canvasObject.parentNode;
			let objtwoChildPos = sys.utils.getChildPosition(objtwo, CDocument.id_paint_canvas);
			let oldCanvasObject = sys.utils.getChild(obj, CDocument.id_paint_canvas);
			let doctwo = sys.utils.getGrandparent(gl.canvasObject, CDocument.ids_to_paint_area_reversed).parentNode;
			
			//replaceChild( new, old );
			obj.replaceChild(gl.canvasObject, oldCanvasObject);
			if(objtwoChildPos != -1) objtwo.insertBefore(oldCanvasObject, objtwo.children[objtwoChildPos]);
				
			//add mous functions to paint document object
			this.baseWindowOffset = [gl.canvasObject.offsetLeft, gl.canvasObject.offsetTop];
			
			this.transformMouseCoords = function(pos){
				pos[0] = pos[0] - this.baseWindowOffset[0];
				pos[1] = pos[1] - this.baseWindowOffset[1];
			}
			
			// gl.activeDoc = this;
			CDocuments.setActive(this.parentCDocument);
			
			this.parentCDocument.paintCanvas = gl.canvasObject;
			doctwo.parentCDocument.paintCanvas = null;
			
			//ToDo: zIndex not working
			//set to front
			this.style.zIndex = 1;
			//set to back
			doctwo.style.zIndex = -1;
		}
		else if(CDocuments.Count() == 1){
			
			let obj = sys.utils.getGrandchild(this, CDocument.ids_to_paint_area);
			let oldCanvasObject = sys.utils.getChild(obj, CDocument.id_paint_canvas);

			obj.replaceChild(gl.canvasObject, oldCanvasObject);
			this.baseWindowOffset = [gl.canvasObject.offsetLeft, gl.canvasObject.offsetTop];
			
			this.transformMouseCoords = function(pos){
				pos[0] = pos[0] - this.baseWindowOffset[0];
				pos[1] = pos[1] - this.baseWindowOffset[1];
			}
			
			CDocuments.setActive(this.parentCDocument);
			
			this.parentCDocument.paintCanvas = gl.canvasObject;
			this.style.zIndex = 1;
		}
	}
	
	getPaintCanvas(){ return this.paintCanvas; }
	
	Delete(){
		for(let i = 0; i < this.layers.length; ++i){
			this.layers[i].Delete();
			this.layers[i] = null;
		}
		this.layers = [];
	}
}

CDocument.createdCount = 0;
CDocument.ids_to_paint_area = ["panelmain","document_size","document_display_grid","document_paint_area"];
CDocument.ids_to_paint_area_reversed = ["document_paint_area","document_display_grid","document_size","panelmain"];
CDocument.id_paint_canvas = "document_paint_canvas";
CDocument.ids_to_size = ["panelmain","document_size"];

export class CDocuments{
	
	constructor(){
	}
	
	static CreateDocument(w,h){
		let doc = new CDocument(null);
		CDocuments.documents[CDocuments.documents.length] = doc;
		doc.CreateNew(w,h);
		return doc;
	}
	
	static setActive(doc){
		CDocuments.activeDoc = doc;
	}
	
	static Count(){ return CDocuments.documents.length; }
	
	static getActive(){ return CDocuments.activeDoc; }
}

CDocuments.documents = [];
CDocuments.activeDoc = null;
