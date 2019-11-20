import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js";
import * as ui from "./ui.js"
import * as command from "./command.js"
import * as brushInterpolator from "./brushInterpolator.js"

import { CLayer, CRasterLayer, CVectorLayer } from "./layer.js";

class CLayerRenderer extends command.ICommandExecute{
	
	/*
		
	*/
	
	constructor(){
		super();
		this.setType("CLayerRenderer");
		this.framebuffer = new glext.CFramebuffer(false); this.framebuffer.Create();
		this.quad_model = new glext.CModel(-1);
		glext.GenQuadModel(this.quad_model);
	}
	
	RenderLayer(shader){
		
	}
}

class CCursor extends command.ICommandExecute{
	
	constructor(w, h){
		super();
		this.setType("CCursor");
		this.width = w;
		this.height = h;
		this.X = 0.0;
		this.Y = 0.0;
		this.x = 0.0;
		this.y = 0.0;
		this.Pos = [0.0,0.0];
		this.pos = [0.0,0.0];
		let bBtnLeft = false;
		let bLeftDown = false;
		let bLeftUp = false;
	}
	
	set(posX, posY, bBtnLeft, bLeftDown, bLeftUp){
		this.X = posX;
		this.Y = posY;
		this.x = this.X / this.width;
		this.y = this.Y / this.height;
		this.Pos = [this.X, this.Y];
		this.pos = [this.x, this.y];
		this.bBtnLeft = bBtnLeft;
		this.bLeftDown = bLeftDown;
		this.bLeftUp = bLeftUp;
	}
}

export class CDocument extends ui.CGUIElement{
	
	constructor(docId){
		super();
		this.setType("CDocument");
		
		++CDocument.createdCount;
		
		if(docId != null){
			this.htmlObj = document.getElementById(docId);
			this.docId = docId;
			//ToDo: init width/height from htmlObj
			this.width = 0;
			this.height = 0;
		}
		else{
			this.htmlObj = null;
			this.docId = "document_file_" + CDocument.createdCount.toString();
			this.width = 0;
			this.height = 0;
		}
		
		this.layers = [];
		// this.canvas = CanvasHandler.CreateHandle();
		this.editingID = 0; //id layera u listi layers koji se trenutno editira
		
		this.paintCanvas = null;
		// this.parentCDocument = null;
		
		this.activeLayerID = 0;
		
		this.brush = null;
		this.cursor = null;
			
		this.interpolator = new brushInterpolator.CBrushInterpolator();
	}
	
	setBrush(brsh){
		this.brush = brsh;
	}
	
	clearBrush(){
		this.brush = null;
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.setZIndex( ui.CGUIElement.zIndex_Document );
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
	
//----------------------------------------------------------------------
//	set size
//----------------------------------------------------------------------
	
	setSize(w, h){
		let sizeobj = sys.utils.getGrandchild(this.htmlObj, CDocument.ids_to_size);
		sizeobj.style.width = (w + 32).toString() + "px";
		sizeobj.style.height = (h + 32).toString() + "px";
		this.width = w;
		this.height = h;
		this.cursor = new CCursor(w, h);
	}
	
	/*resizes the document and every layer in it. */
	ResizeInPixels(dleft, dright, dup, ddown){
		for(let i = 0; i < this.layers.length; ++i){
			this.layers[i].ResizeCanvas(dleft, dright, dup, ddown); }
		let dw = dleft + dright; let dh = dup + ddown;
		this.setSize(this.width+dw, this.height+dh);
		this.UpdatePaintCanvasSize();
	}
	
	RescaleInPixels(dleft, dright, dup, ddown){
		for(let i = 0; i < this.layers.length; ++i){
			this.layers[i].ScaleCanvas(dleft, dright, dup, ddown); }
		let dw = dleft + dright; let dh = dup + ddown;
		this.setSize(this.width+dw, this.height+dh);
		this.UpdatePaintCanvasSize();
	}
	
	ResizeInPercentage(pleft, pright, pup, pdown){
		let dleft = pleft * this.width;
		let dright = pright * this.width;
		let dup = pup * this.height;
		let ddown = pdown * this.height;
		this.ResizeInPixels(dleft, dright, dup, ddown);
	}
	
	RescaleInPercentage(pleft, pright, pup, pdown){
		let dleft = pleft * this.width;
		let dright = pright * this.width;
		let dup = pup * this.height;
		let ddown = pdown * this.height;
		this.RescaleInPixels(dleft, dright, dup, ddown);
	}
	
	Resize(){
		let func = (arguments[0] == "percent")? this.ResizeInPercentage.bind(this) : this.ResizeInPixels.bind(this);
		
		if(arguments.length > 3)
			func(arguments[1],arguments[2],arguments[3],arguments[4]);
		else{
			let dw = arguments[1]/2.0; let dh = arguments[2]/2.0;
			func( dw, dw, dh, dh );
		}
	}
	Rescale(){
		let func = (arguments[0] == "percent")? this.RescaleInPercentage.bind(this) : this.RescaleInPixels.bind(this);
		
		if(arguments.length > 3)
			func(arguments[1],arguments[2],arguments[3],arguments[4]);
		else{
			let dw = arguments[1]/2.0; let dh = arguments[2]/2.0;
			func( dw, dw, dh, dh );
		}
	}
	
//----------------------------------------------------------------------
	
	CreateNew(w, h){
		
		this.width = w;
		this.height = h;
		
		//load html file and create dom elements from it (callback function)
		sys.html.CreateDOMFromHTMLFile(this, "./windows/document.html", function(_this, obj){
			_this.htmlObj = document.createElement('div');
			_this.htmlObj.docId = _this.docId;
			_this.htmlObj.appendChild(obj);
			
			_this.CreateFromDOM(_this.htmlObj, _this);
			_this.htmlObj.uiObj = _this;
		
			_this.setSize(w, h);
			
			document.body.appendChild(_this.htmlObj);
			
			_this.htmlObj.style.position = "absolute";
			// _this.htmlObj.onclick = document.window.document_onclick(_this.docId);
			
			_this.htmlObj.AttachGLCanvas = _this.AttachGLCanvas;
			// _this.htmlObj.onclick = _this.AttachGLCanvas;
			_this.addOnClick(_this);
			
			sys.html.MakeElementMovable(_this.htmlObj, "data-movable-element-handle");
		});
	}
	
	getActivePaintLayer(){ return this.layers[this.activeLayerID].getPaintLayer(); }
	
	BringToFront(){
		this.uiObj.setZIndex( ui.CGUIElement.zIndex_Document+1 );
	}
	
	onClick(){
		this.htmlObj.AttachGLCanvas();
	}
	
	RenderVisibleLayersToCanvas(){
		let shader = glext.NDCQuadModel.mainDisplayShader;
		glext.CFramebuffer.BindMainFB();	
		glext.gl.viewport(0, 0, glext.gl.viewportWidth, glext.gl.viewportHeight);
		glext.gl.clearColor(0.0,0.0,0.0,1.0);
		glext.gl.clear(glext.gl.COLOR_BUFFER_BIT | glext.gl.DEPTH_BUFFER_BIT);
		
		shader.Bind();
			this.getActivePaintLayer().texture.Bind(0, shader.ULTextureD);
			glext.NDCQuadModel.RenderIndexedTriangles(shader);
		this.getActivePaintLayer().texture.Unbind();
	}
		
	getHMTLImageFromCanvas(){
		this.RenderVisibleLayersToCanvas();				
		let img = document.createElement('img');
		img.src = glext.gl.canvasObject.toDataURL();
		return img;
	}
	
	AddHTMLImage(htmlImg){
		htmlImg.id = this.docId + "_img";
		// htmlImg.style.position = "absolute";
		htmlImg.style = glext.gl.canvasObject.style;
		let obj = sys.utils.getGrandchild(this.htmlObj, CDocument.ids_to_paint_area);
		obj.appendChild(htmlImg);
	}
	
	RemoveHTMLImage(){
		let obj = sys.utils.getGrandchild(this.htmlObj, CDocument.ids_to_paint_area);
		let i = sys.utils.getChildPosition(obj, this.docId + "_img");
		if(i != -1)
			obj.removeChild(obj.childNodes[i]);
	}
	
	//updates the OpenGL paint canvas, if this is active document
	UpdatePaintCanvasSize(){
		if(this.paintCanvas == null) return;
		
		if(this.paintCanvas.width != this.width || this.paintCanvas.height != this.height){
			this.paintCanvas.width = this.width;
			this.paintCanvas.height = this.height;
			glext.ResizeCanvas(this.width, this.height);
			
			let dw = this.width - this.getActivePaintLayer().width;
			let dh = this.height - this.getActivePaintLayer().height;
			
			this.getActivePaintLayer().ResizeCanvas(Math.floor(dw/2.0), Math.floor(dw/2.0), Math.ceil(dh/2.0), Math.ceil(dh/2.0));
		}
	}
	
	AttachGLCanvas(){
		//this function operates on htmlObj from CDocument (this ptr is htmlObj)
		let gl = glext.gl;
		if(gl == null) return;
		// assert(CDocuments.Count() != 0);
		if(CDocuments.getActive() === this.uiObj) return;
		
		if(CDocuments.Count() > 1){
			
			let obj = sys.utils.getGrandchild(this, CDocument.ids_to_paint_area);
			let objtwo = gl.canvasObject.parentNode;
			let objtwoChildPos = sys.utils.getChildPosition(objtwo, CDocument.id_paint_canvas);
			let oldCanvasObject = sys.utils.getChild(obj, CDocument.id_paint_canvas);
			let doctwo = sys.utils.getGrandparent(gl.canvasObject, CDocument.ids_to_paint_area_reversed).parentNode;
			
			let htmlImg = doctwo.uiObj.getHMTLImageFromCanvas();
			doctwo.uiObj.AddHTMLImage(htmlImg);
			
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
			CDocuments.setActive(this.uiObj);
			
			this.uiObj.paintCanvas = gl.canvasObject;
			doctwo.uiObj.paintCanvas = null;
			this.uiObj.UpdatePaintCanvasSize();
			this.uiObj.RenderVisibleLayersToCanvas();
			this.uiObj.RemoveHTMLImage();
			
			//set to front
			this.uiObj.setZIndex( ui.CGUIElement.zIndex_Document );
			//set to back
			doctwo.uiObj.setZIndex( ui.CGUIElement.zIndex_ToBack );
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
			
			CDocuments.setActive(this.uiObj);
			
			this.uiObj.paintCanvas = gl.canvasObject;
			this.uiObj.setZIndex( ui.CGUIElement.zIndex_Document );
		}
	}
	
	getPaintCanvas(){ return this.paintCanvas; }
	
//----------------------------------------------------------------------
//	Update()
//----------------------------------------------------------------------
	
	updateCursor(X, Y, bBtnLeft, bLeftDown, bLeftUp){
		if(this.cursor == null) return;
		this.cursor.set(X, Y, bBtnLeft, bLeftDown, bLeftUp);
	}
	
	updateBrush(){
		if(this.brush == null) return;
		if(this.cursor == null) return;
		/*
		brush has only position update here,
		because other params are state of the brush and should be updated elsewhere
		document only cares about position where to draw with brush, 
		and brush gets it color/size/type from other places (i.e. palette...)
		*/
		if(this.cursor.bBtnLeft == false){
			this.brush.setColor(0.0,0.0,0.0); } //ToDo: make brush disabling with other option, color value should be kept by the brush
		else{			
			this.brush.setPosition( this.cursor.pos ); }
		
		let pos = [this.cursor.pos[0],1.0-this.cursor.pos[1]];
		
		if(this.cursor.bLeftDown == true)
			this.interpolator.Start(pos);
		else if(this.cursor.bLeftUp == true)
			this.interpolator.End(pos);
		else
			this.interpolator.Next(pos);
		
		//initialDeltaT, minimalDeltaT, maxAngle, maxDistance, minDistance
		//		0.02, 			0.0002,		2.5,		0.05,		0.02
		let PointsI = this.interpolator.Interpolate(0.2, 0.02, 2.5, 0.1, 0.05);
		
		if(PointsI != undefined && PointsI.length > 0){
			this.brush.setStrokeStart();
			this.brush.setStrokeEnd();
			this.brush.UploadPointListToShader(PointsI);
		}
		else{
			this.brush.setStrokeEnd(false);
			this.brush.setStrokeStart(false);
			this.brush.ClearShaderPointList();
		}
		
		glext.CBlendMode.Bind(glext.CBlendMode.None);
		
		this.brush.Update();
	}
	
	updateLayers(){
		//updating of all layers
		for(let i = 0; i < this.layers.length; ++i){
			let layer = this.layers[i].getPaintLayer();
			if(layer != null){
				layer.Begin(this.brush.shader);
				layer.Draw();
				layer.End();
			}
		}
	}
	
	Update(cmd){ //X, W, bPressed
		
		if(cmd != undefined && cmd != null){
			this.exec(cmd);
		}
	}
	
//----------------------------------------------------------------------
	
	execMouseEvent(cmd){
		let cmdP = cmd.commandParams;
		//cmd.set(doc.objectId, "CDocument", "mouseEvent", "absoluteMousePos", mousePos, bBtnLeft, sys.mouse.get().bLeftDown, sys.mouse.get().bLeftUp);
		
		let pos = cmdP.params[1].value;
		if(cmdP.params[0].value == "absoluteMousePos"){
			this.uiObj.paintCanvas.transformMouseCoords(pos);
			cmdP.params[0].value = "relativeMousePos";
		}
		let bBtnLeft = cmdP.params[2].value;
		let bLeftDown = cmdP.params[3].value;
		let bLeftUp = cmdP.params[4].value;
		
		this.updateCursor(pos[0], pos[1], bBtnLeft, bLeftDown, bLeftUp);
		this.updateBrush();
		this.updateLayers();
	}
	
	exec(cmd){
		if(cmd.objectType != "CDocument")
			return;
		
		if(cmd.command == "mouseEvent")
			this.execMouseEvent(cmd);
	}
	
//----------------------------------------------------------------------
	
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

export class CDocuments extends command.ICommandExecute{
	
	constructor(){
		super();
		this.setType("CDocuments");
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
