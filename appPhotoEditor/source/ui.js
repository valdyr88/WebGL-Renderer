import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js";
import * as command from "./command.js"

//==================================================================================
// CDOMEventListerners
//==================================================================================

class CDOMEventListerners extends command.ICommandExecute{
	
	constructor(){
		super();
		this.setType("CDOMEventListerners");
		
		this.uiObj = null;
		
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
		this.uiObj = obj;
		obj.htmlObj.uiObj = obj;
		
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
		let _this = this.uiObj;
		let callbacks = _this.onMouseDownCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onMouseDown();
	}
	eventListener_onMouseUp(){
		let _this = this.uiObj;
		let callbacks = _this.onMouseUpCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onMouseUp();
	}
	eventListener_onMouseEnter(){
		let _this = this.uiObj;
		let callbacks = _this.onMouseEnterCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onMouseEnter();
	}
	eventListener_onMouseLeave(){
		let _this = this.uiObj;
		let callbacks = _this.onMouseLeaveCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onMouseLeave();
	}
	
	eventListener_onClick(){
		let _this = this.uiObj;
		let callbacks = _this.onClickCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onClick();
	}
	
	eventListener_onTouchStart(){
		let _this = this.uiObj;
		let callbacks = _this.onTouchStartCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onTouchStart();
	}
	eventListener_onTouchMove(){
		let _this = this.uiObj;
		let callbacks = _this.onTouchMoveCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onTouchMove();
	}
	eventListener_onTouchEnd(){
		let _this = this.uiObj;
		let callbacks = _this.onTouchEndCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onTouchEnd();
	}
	eventListener_onTouchCancel(){
		let _this = this.uiObj;
		let callbacks = _this.onTouchCancelCallbacks;
		for(let i = 0; i < callbacks.length; ++i) callbacks[i].onTouchCancel();
	}
	
	addOnMouseDown(obj){
		let callbacks = this.onMouseDownCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnMouseUp(obj){
		let callbacks = this.onMouseUpCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnMouseEnter(obj){
		let callbacks = this.onMouseEnterCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnMouseLeave(obj){
		let callbacks = this.onMouseLeaveCallbacks;
		callbacks[callbacks.length] = obj; }
	
	addOnClick(obj){
		let callbacks = this.onClickCallbacks;
		callbacks[callbacks.length] = obj; }
		
	addOnTouchStart(obj){
		let callbacks = this.onTouchStartCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnTouchMove(obj){
		let callbacks = this.onTouchMoveCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnTouchEnd(obj){
		let callbacks = this.onTouchEndCallbacks;
		callbacks[callbacks.length] = obj; }
	addOnTouchCancel(obj){
		let callbacks = this.onTouchCancelCallbacks;
		callbacks[callbacks.length] = obj; }
}

//==================================================================================
// CGUIElement
//==================================================================================

export class CGUIElement extends CDOMEventListerners{
	
	constructor(){
		super();
		this.setType("CGUIElement");
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
		this.htmlObj.uiObj = this;
		
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

CGUIElement.zIndex_Menu = 10;
CGUIElement.zIndex_Document = 1;
CGUIElement.zIndex_OutOfFocus = -1;
CGUIElement.zIndex_ToBack = -1;

//==================================================================================
// CButton
//==================================================================================

export class CButton extends CGUIElement{
	
	constructor(){
		super();
		this.setType("CButton");
		this.bPressed = false;
		this.bClicked = false;
		this.bOldPressed = false;
		this.name = "";
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.htmlObj.uiObj = this;
		super.addOnMouseDown(this);
		super.addOnMouseUp(this);
		super.addOnMouseEnter(this);
		super.addOnMouseLeave(this);
		super.addOnTouchStart(this);
		super.addOnTouchMove(this);
		super.addOnTouchEnd(this);
		super.addOnTouchCancel(this);
		
		this.name = this.htmlObj.innerText;
	}
	
	onMouseDown(){
		this.bPressed = true;
	}
	onMouseUp(){
		this.bPressed = false;
	}
	onMouseEnter(){
		this.bPressed = false;
	}
	onMouseLeave(){
		this.bPressed = false;
	}
	onTouchStart(){
		this.bPressed = true;
	}
	onTouchMove(){
	}
	onTouchEnd(){
		this.bPressed = false;
	}
	onTouchCancel(){
		this.bPressed = false;
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

//==================================================================================
// CDropdown & CDropdownList
//==================================================================================

export class CDropdown extends CGUIElement{
	
	constructor(){
		super();
		this.setType("CDropdown");
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.setVisibility(false);
		this.setZIndex( CGUIElement.zIndex_Menu );
	}
}

export class CDropdownList extends CDropdown{
	
	constructor(){
		super();
		this.setType("CDropdownList");
		this.bVisible = false;
		this.buttons = [];
	}
	
	CreateFromDOM(dom, caller){
		let _this = (caller == null || caller == undefined)? this : caller;
		super.CreateFromDOM(dom, _this);
		
		this.setVisibility(false);
		this.setZIndex( CGUIElement.zIndex_Menu );
		
		let domBtns = sys.utils.getAllByTagName(this.htmlObj, "BUTTON");
		for(let i = 0; i < domBtns.length; ++i){
			let btn = new CButton();
			this.buttons[this.buttons.length] = btn;
			
			btn.CreateFromDOM(domBtns[i]);
		}
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

//==================================================================================
// CMenubar
//==================================================================================

function overrideUpdateMenubarButton(menubar){
	this.Update();
	
	if(this.bClicked == true){
		this.dropDownList.toggleVisibility();
		// this.dropDownList.setZIndex( CGUIElement.zIndex_Menu );
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
		this.setType("CMenubar");
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
		
		super.addOnClick(this);
		
		for(let i = 0; i < domBtnList.length; ++i){
			let dom = domBtnList[i];
			let btn = new CButton();
			let drpdwn = new CDropdownList();
			this.buttons[this.buttons.length] = btn;
			
			let domBtn = sys.utils.getAllByClassFrom(dom, "menubar-dropbtn");
			let domDroplist = sys.utils.getAllByClassFrom(dom, "menubar-dropdown-content");
			
			btn.CreateFromDOM(domBtn[0]);
			drpdwn.CreateFromDOM(domDroplist[0]);
			btn.dropDownList = drpdwn;
			btn.UpdateMenubarButton = overrideUpdateMenubarButton;
		}
		
		this.setZIndex( CGUIElement.zIndex_Menu );
		for(let i = 0; i < this.buttons.length; ++i)
			this.buttons[i].setZIndex( CGUIElement.zIndex_Menu );
	}
	
	onDocumentClick(){
		this.bClickedDocument = true;
	}
	onClick(){
		this.bClicked = true;
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

//==================================================================================