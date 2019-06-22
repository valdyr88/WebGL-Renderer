import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js";

class CDOMEventListerners{
	
	constructor(){
		this.uiobject = null;
		
		this.onMouseDownCallbacks = [];
		this.onMouseUpCallbacks = [];
		this.onMouseEnterCallbacks = [];
		this.onMouseLeaveCallbacks = [];
		this.onClickCallbacks = [];
		this.onTouchStartCallbacks = [];
		this.onTouchMoveCallbacks = [];
		this.onTouchEndCallbacks = [];
		this.onTouchCancelCallbacks = [];
	}
	
	RegisterEventListeners(obj){
		this.uiobject = obj;
		obj.htmlObj.uiobject = obj;
		
		obj.htmlObj.addEventListener("mousedown", this.eventListener_onMouseDown);
		obj.htmlObj.addEventListener("mouseup", this.eventListener_onMouseUp);
		obj.htmlObj.addEventListener("mouseenter", this.eventListener_onMouseEnter);
		obj.htmlObj.addEventListener("mouseleave", this.eventListener_onMouseLeave);
		obj.htmlObj.addEventListener("touchstart", this.eventListener_onTouchStart);
		obj.htmlObj.addEventListener("touchmove", this.eventListener_onTouchMove);
		obj.htmlObj.addEventListener("touchend", this.eventListener_onTouchEnd);
		obj.htmlObj.addEventListener("touchcancel", this.eventListener_onTouchCancel);
		obj.htmlObj.addEventListener("click", this.eventListener_onClick);
	}
	
	eventListener_onMouseDown(){
		let _this = this.uiobject;
		let callbacks = _this.onMouseDownCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	eventListener_onMouseUp(){
		let _this = this.uiobject;
		let callbacks = _this.onMouseUpCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	eventListener_onMouseEnter(){
		let _this = this.uiobject;
		let callbacks = _this.onMouseEnterCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	eventListener_onMouseLeave(){
		let _this = this.uiobject;
		let callbacks = _this.onMouseLeaveCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	
	eventListener_onClick(){
		let _this = this.uiobject;
		let callbacks = _this.onClickCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	
	eventListener_onTouchStart(){
		let _this = this.uiobject;
		let callbacks = _this.onTouchStartCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	eventListener_onTouchMove(){
		let _this = this.uiobject;
		let callbacks = _this.onTouchMoveCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	eventListener_onTouchEnd(){
		let _this = this.uiobject;
		let callbacks = _this.onTouchEndCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](this);
	}
	eventListener_onTouchCancel(){
		let _this = this.uiobject;
		let callbacks = _this.onTouchCancelCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i](_this);
	}
	
	addOnMouseDown(func){
		let callbacks = this.onMouseDownCallbacks;
		callbacks[callbacks.length] = func; }
	addOnMouseUp(func){
		let callbacks = this.onMouseUpCallbacks;
		callbacks[callbacks.length] = func; }
	addOnMouseEnter(func){
		let callbacks = this.onMouseEnterCallbacks;
		callbacks[callbacks.length] = func; }
	addOnMouseLeave(func){
		let callbacks = this.onMouseLeaveCallbacks;
		callbacks[callbacks.length] = func; }
	
	addOnClick(func){
		let callbacks = this.onClickCallbacks;
		callbacks[callbacks.length] = func; }
		
	addOnTouchStart(func){
		let callbacks = this.onTouchStartCallbacks;
		callbacks[callbacks.length] = func; }
	addOnTouchMove(func){
		let callbacks = this.onTouchMoveCallbacks;
		callbacks[callbacks.length] = func; }
	addOnTouchEnd(func){
		let callbacks = this.onTouchEndCallbacks;
		callbacks[callbacks.length] = func; }
	addOnTouchCancel(func){
		let callbacks = this.onTouchCancelCallbacks;
		callbacks[callbacks.length] = func; }
}

export class CGUIElement extends CDOMEventListerners{
	
	constructor(){
		super();
		this.name = "";
		this.htmlObj = null;
		this.dTime = 0.0;
		this.bVisible = true;
	}
	
	//inheritors to this class should implement this function and pass in them self as caller (or a parent of theirs)
	CreateFromDOM(dom, caller){
		if(typeof dom === 'string')
			dom = document.getElementById(dom);
		this.htmlObj = dom;
		this.htmlObj.uiobject = this;
		
		this.RegisterEventListeners(caller);
	}
	
	Update(){
		this.dTime = sys.time.getDeltaTime();
	}
	
	setZIndex(z){
		this.htmlObj.style.zIndex = z;
	}
	
	setVisibility(bVisible){
		this.bVisible = bVisible;
		if(this.bVisible == true){ this.htmlObj.style.visibility = 'visible'; }
		else{ this.htmlObj.style.visibility = 'hidden'; }
	}
	
	toggleVisibility(){
		this.bVisible = !this.bVisible;
		this.setVisibility(this.bVisible);
	}
}

export class CButton extends CGUIElement{
	constructor(){
		super();		
		this.bPressed = false;
		this.bClicked = false;
		this.bOldPressed = false;
		this.name = "";
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.htmlObj.uiobject = this;
		super.addOnMouseDown(this.onMouseDown);
		super.addOnMouseUp(this.onMouseUp);
		super.addOnMouseEnter(this.onMouseEnter);
		super.addOnMouseLeave(this.onMouseLeave);
		super.addOnTouchStart(this.onTouchStart);
		super.addOnTouchMove(this.onTouchMove);
		super.addOnTouchEnd(this.onTouchEnd);
		super.addOnTouchCancel(this.onTouchCancel);
		
		this.name = this.htmlObj.innerText;
	}
	
	onMouseDown(_this){
		_this.bPressed = true;
	}
	onMouseUp(_this){
		_this.bPressed = false;
	}
	onMouseEnter(_this){
		_this.bPressed = false;
	}
	onMouseLeave(_this){
		_this.bPressed = false;
	}
	onTouchStart(_this){
		_this.bPressed = true;
	}
	onTouchMove(_this){
	}
	onTouchEnd(_this){
		_this.bPressed = false;
	}
	onTouchCancel(_this){
		_this.bPressed = false;
	}
		
	onClick(){
		this.bClicked = true;
	}
		
	BeginUpdate(){
		this.bClicked = false;
	}	
	EndUpdate(){
		this.bOldPressed = this.bPressed;
	}
	Update(){
		super.Update();
		this.BeginUpdate();
		
		if(this.bOldPressed == true && this.bOldPressed != this.bPressed){
			this.onClick(); }
		
		this.EndUpdate();
	}
}

export class CDropdown extends CGUIElement{
	
	constructor(){
		super();
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
	}
}

export class CDropdownList extends CDropdown{
	
	constructor(){
		super();
		this.bVisible = false;
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.setVisibility(false);
	}
	
	setVisibility(bVisible){
		this.bVisible = bVisible;
		if(this.bVisible == true){
			this.htmlObj.style.visibility = 'visible';
			this.htmlObj.style.display = 'block';
		}
		else{	
			this.htmlObj.style.visibility = 'hidden';
			this.htmlObj.style.display = 'none';
		}
	}
	
	Update(){}
}



function overrideUpdateMenubarButton(menubar){
	this.Update();
	
	if(this.bClicked == true){
		this.dropDownList.toggleVisibility();
		this.dropDownList.setZIndex(10);
	}else if(menubar.bClicked == true){
		this.dropDownList.setVisibility(false);
	}
	
	if(menubar.bClickedOutOfBoundary == true)
		this.dropDownList.setVisibility(false);
}

function eventListener_onDocumentClick(){
	menubar.onDocumentClick(); };



export class CMenubar extends CGUIElement{
	
	constructor(){
		super();
		this.buttons = [];
		this.bClickedOutOfBoundary = false;
		this.bClickedDocument = false;
		this.bClicked = false;
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		let domBtnList = sys.utils.getAllByClassFrom(this.htmlObj, "menubar-dropdown");
		
		eventListener_onDocumentClick._this = this;
		document.addEventListener('click', eventListener_onDocumentClick);
		
		super.addOnClick(this.onClick);
		
		for(let i = 0; i < domBtnList.length; ++i){
			let dom = domBtnList[i];
			let btn = new CButton();
			let drpdwn = new CDropdownList();
			this.buttons[this.buttons.length] = btn;
			
			let domBtn = dom.childNodes[0];
			let domDroplist = dom.childNodes[1];
			
			btn.CreateFromDOM(domBtn);
			drpdwn.CreateFromDOM(domDroplist);
			btn.dropDownList = drpdwn;
			btn.UpdateMenubarButton = overrideUpdateMenubarButton;
		}
	}
	
	onDocumentClick(){
		this.bClickedDocument = true;
	}
	onClick(_this){
		_this.bClicked = true;
	}
	
	BeginUpdate(){
		//out of boundary click
		this.bClickedOutOfBoundary = this.bClickedDocument == true && this.bClicked == false;
	}
	EndUpdate(){
		this.bClickedDocument = false;
		this.bClicked = false;}
		
	Update(){
		this.BeginUpdate();
		
		for(let i = 0; i < this.buttons.length; ++i)
			this.buttons[i].UpdateMenubarButton(this);
		
		this.EndUpdate();
	}
}

export var menubar = new CMenubar();