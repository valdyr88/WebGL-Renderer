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
	
	constructor(w,h){
		this.layers = [];
		this.canvas = CanvasHandler.CreateHandle();
		this.editingID = 0; //id layera u listi layers koji se trenutno editira
	}
	
	CollapseForDisplay(){
		//collapsat layere od 0 - editingID-1 u donju teksturu, a editingID+1 do layers.length-1 u gornju.
	}
}