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

function movable_OnMouseDown(e){
	e = e || window.event;
	e.preventDefault();
	
	this.oldMouseX = e.clientX;
	this.oldMouseY = e.clientY;
	
	/* this.onmouseup = movable_StopMovement;
	this.onmousemove = movable_DragElement; */
	document.onmouseup = movable_StopMovement;
	document.onmousemove = movable_DragElement;
	document.movable_element = this;
}

function movable_DragElement(e){
	e = e || window.event;
	e.preventDefault();
	
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
}

export function MakeElementMovable(elem){
	var obj = elem;
	if(typeof elem === 'string'){ obj = document.getElementById(elem); }
	
	obj.onmousedown = movable_OnMouseDown;
	
	obj.oldMouseX = 0;
	obj.oldMouseY = 0;
}

export function MakeElementsMovable(elems){
	if(elems == null) return;
	if(typeof elems == 'string') MakeElementMovable(elems);
	else{
		if(elems.length == undefined) MakeElementMovable(elems);
		for(let i = 0; i < elems.length; ++i) MakeElementMovable(elems[i]);
	}
}

//----------------------------------------------------------------------------------------------------