import * as fetch from "./fetch.js"


//----------------------------------------------------------------------------------------------------
// inline HTML file. potrebno je dodat attribut data-inline-html (moze i neki drugi isto) i pozvat ParseForHTMLIncludes(document, 'data-inline-html')
//----------------------------------------------------------------------------------------------------

export function inlineHTMLfile(src, obj){
	fetch.fetchTextFileSrc(src, function(txt){
		var write_file = null;
		write_file = (typeof obj === 'string')? document.getElementById(obj) : obj;
		write_file.innerHTML = txt;
	});
}

export function ParseForHTMLIncludes(doc, strAttribute){
	var allElements = doc.getElementsByTagName("*");
	
	if(strAttribute == undefined || strAttribute == null) strAttribute = "data-inline-html";
	
	for(let i = 0; i < allElements.length; ++i){
		
		let el = allElements[i];
		let file_src = el.getAttribute(strAttribute);
		
		if(file_src != null){
			el.removeAttribute(strAttribute);
			inlineHTMLfile(file_src, el);
		}
	}
}

//----------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------
// movable elements
//----------------------------------------------------------------------------------------------------

class Rect{
	constructor(X0,Y0,X1,Y1){
		this.x0 = X0;
		this.x1 = X1;
		this.y0 = Y0;
		this.y1 = Y1;
		this.width = X1-X0;
		this.height = Y1-Y0;
	}
	isWithin(x,y){
		return (x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1);
	}
}

function movable_OnMouseDown(e){
	e = e || window.event;
	
	this.oldMouseX = e.clientX;
	this.oldMouseY = e.clientY;
	
	var localX = e.clientX - this.offsetLeft;
	var localY = e.clientY - this.offsetTop;
	var bInSelectRect = true;
	
	//provjera jeli unutar selection recta
	if(this.selectRect != null && this.selectRect.length != 0)
	{
		bInSelectRect = false;
		
		for(let i = 0; i < this.selectRect.length; ++i){
			let rect = this.selectRect[i];
			if(rect.isWithin(localX,localY) == true){ 
				bInSelectRect = true; break;
			}
		}
	}
	
	if(bInSelectRect == true){
		e.preventDefault();
		document.onmouseup = movable_StopMovement;
		document.onmousemove = movable_DragElement;
		document.movable_element = this;
	}
}

function movable_DragElement(e){
	e = e || window.event;
	e.preventDefault();
	if(document.movable_element == null) return;
	
	var dX = document.movable_element.oldMouseX - e.clientX;
	var dY = document.movable_element.oldMouseY - e.clientY;
	
	document.movable_element.style.top = (document.movable_element.offsetTop - dY) + "px";
	document.movable_element.style.left = (document.movable_element.offsetLeft - dX) + "px";
	
	document.movable_element.oldMouseX = e.clientX;
	document.movable_element.oldMouseY = e.clientY;
}

function movable_StopMovement(e){
	document.onmouseup = null;
	document.onmousemove = null;
	document.movable_element = null;
}

export function MakeElementMovable(elem, rect){
	var obj = elem;
	if(typeof elem === 'string'){ obj = document.getElementById(elem); }
	if(obj == null) return;
	
	obj.onmousedown = movable_OnMouseDown;
	
	obj.oldMouseX = 0;
	obj.oldMouseY = 0;
	
	if(rect == null){
		obj.selectRect = [];}
	else if(rect[0].length == undefined){
		obj.selectRect = [new Rect(rect[0],rect[1],rect[2],rect[3])];}
	else{
		obj.selectRect = [];
		for(let i = 0; i < rect.length; ++i){
			let r = rect[i];
			obj.selectRect[i] = new Rect(r[0],r[1],r[2],r[3]);
		}
	}
	
}

export function MakeElementsMovable(elems){
	if(elems == null) return;
	if(typeof elems == 'string') MakeElementMovable(elems,null);
	else{
		if(elems.length == undefined) MakeElementMovable(elems,null);
		for(let i = 0; i < elems.length; ++i) MakeElementMovable(elems[i],null);
	}
}

//----------------------------------------------------------------------------------------------------