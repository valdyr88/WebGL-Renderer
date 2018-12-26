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

function movable_findMovableRectFromAttrib(obj, strAttribute){
	if(strAttribute == undefined || strAttribute == null) return;
	var allElements = obj.getElementsByTagName("*");
	
	var objRect = obj.getBoundingClientRect();
	var Rects = [];
	
	for(let i = 0; i < allElements.length; ++i)
	{
		let el = allElements[i];
		let bHasAttrib = el.getAttribute(strAttribute) != null;		
		if(bHasAttrib == false){ continue; }
		
		el.removeAttribute(strAttribute);
		let elRect = el.getBoundingClientRect();
		
		let x0 = elRect.left - objRect.left;
		let x1 = x0 + elRect.width;
		let y0 = elRect.top - objRect.top;
		let y1 = y0 + elRect.height;
				
		Rects[Rects.length] = new Rect(x0,y0,x1,y1);
	}
	return Rects;	
}

/*
prima element <elem> kojem ce postaviti onmousedown handler za movement.
<handle> je ili attribut DOM elementa unutar <elem>, ili lista rect koordinata (relativno u odnosu na <elem> koje definiraju area koji pomiče element. ako ovaj parametar nije predan onda se element može pomaknut na bilo kojem mjestu
*/
export function MakeElementMovable(elem, handle){
	var obj = elem;
	if(typeof elem === 'string'){ obj = document.getElementById(elem); }
	if(obj == null) return;
	
	obj.onmousedown = movable_OnMouseDown;
	
	obj.oldMouseX = 0;
	obj.oldMouseY = 0;
	
	if(handle == null){
		obj.selectRect = [];}
	else if(typeof handle == 'string'){
		obj.selectRect = movable_findMovableRectFromAttrib(obj, handle);}
	else if(handle[0].length == undefined){
		obj.selectRect = [new Rect(handle[0],handle[1],handle[2],handle[3])];}
	else{
		obj.selectRect = [];
		for(let i = 0; i < handle.length; ++i){
			let r = handle[i];
			obj.selectRect[i] = new Rect(r[0],r[1],r[2],r[3]);
		}
	}
	
}

/*
prima elemente <elems> kojima ce postaviti onmousedown handler za movement.
<handle_attrib> je attribut pomocu kojeg se definira da taj element je handle za movement
*/
export function MakeElementsMovable(elems, handle_attrib){
	if(elems == null) return;
	if(typeof elems == 'string') MakeElementMovable(elems,handle_attrib);
	else{
		if(elems.length == undefined) MakeElementMovable(elems,handle_attrib);
		for(let i = 0; i < elems.length; ++i) MakeElementMovable(elems[i],handle_attrib);
	}
}

//----------------------------------------------------------------------------------------------------