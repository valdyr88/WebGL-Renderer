import { browser } from "./html.js"

export class CMouse
{
	constructor()
	{
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		
		this.btnLeft = false;
		this.btnMiddle = false;
		this.btnRight = false;
		this.btn4 = false;
		this.btn5 = false;
		
		this.objAttached = null;
		
		this.bLeftDown = false;
		this.bMiddleDown = false;
		this.bRightDown = false;
		
		this.bLeftUp = false;
		this.bMiddleUp = false;
		this.bRightUp = false;
		
		// this.deltaZMode = 0;
	}
	
	//https://stackoverflow.com/questions/7790725/javascript-track-mouse-position
	OnMouseEvent(event)
	{
		if(this.AttachedMouse === undefined) return;
		if(this.AttachedMouse == null) return;
		var dot, eventDoc, doc, body, pageX, pageY;

		event = event || window.event; // IE-ism

		// If pageX/Y aren't available and clientX/Y
		// are, calculate pageX/Y - logic taken from jQuery
			// Calculate pageX/Y if missing and clientX/Y available
		if (event.pageX == null && event.clientX != null) {
		eventDoc = (event.target && event.target.ownerDocument) || document;
		doc = eventDoc.documentElement;
		body = eventDoc.body;

		event.pageX = event.clientX +
		  (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
		  (doc && doc.clientLeft || body && body.clientLeft || 0);
		event.pageY = event.clientY +
		  (doc && doc.scrollTop  || body && body.scrollTop  || 0) -
		  (doc && doc.clientTop  || body && body.clientTop  || 0 );
		}
		
		this.AttachedMouse.dx = event.pageX - this.AttachedMouse.x;
		this.AttachedMouse.dy = event.pageY - this.AttachedMouse.y;
		
		this.AttachedMouse.x = event.pageX;
		this.AttachedMouse.y = event.pageY;
		
		if(this.AttachedMouse.dz === undefined || this.AttachedMouse.dz == null) this.AttachedMouse.dz = 0;
		
		let old_btnLeft = this.AttachedMouse.btnLeft;
		let old_btnMiddle = this.AttachedMouse.btnMiddle;
		let old_btnRight = this.AttachedMouse.btnRight;
		
		this.AttachedMouse.btnLeft = event.buttons & 0x01;
		this.AttachedMouse.btnMiddle = event.buttons & 0x02;
		this.AttachedMouse.btnRight = event.buttons & 0x04;
		this.AttachedMouse.btn4 = event.buttons & 0x08;
		this.AttachedMouse.btn5 = event.buttons & 0x10;
		
		if(this.AttachedMouse.btnLeft === 1) this.AttachedMouse.btnLeft = true;
		if(this.AttachedMouse.btnLeft === 0) this.AttachedMouse.btnLeft = false;
		if(this.AttachedMouse.btnMiddle === 1) this.AttachedMouse.btnMiddle = true;
		if(this.AttachedMouse.btnMiddle === 0) this.AttachedMouse.btnMiddle = false;
		if(this.AttachedMouse.btnRight === 1) this.AttachedMouse.btnRight = true;
		if(this.AttachedMouse.btnRight === 0) this.AttachedMouse.btnRight = false;
		if(this.AttachedMouse.btn4 === 1) this.AttachedMouse.btn4 = true;
		if(this.AttachedMouse.btn4 === 0) this.AttachedMouse.btn4 = false;
		if(this.AttachedMouse.btn5 === 1) this.AttachedMouse.btn5 = true;
		if(this.AttachedMouse.btn5 === 0) this.AttachedMouse.btn5 = false;
		
		if(this.AttachedMouse.btnLeft == true) this.AttachedMouse.bLeftDown = this.AttachedMouse.btnLeft;
		if(this.AttachedMouse.btnMiddle == true) this.AttachedMouse.bMiddleDown = this.AttachedMouse.btnMiddle;
		if(this.AttachedMouse.btnRight == true) this.AttachedMouse.bRightDown = this.AttachedMouse.btnRight;
		
		if(old_btnLeft != this.AttachedMouse.btnLeft && old_btnLeft == true) this.AttachedMouse.bLeftUp = true;
		if(old_btnMiddle != this.AttachedMouse.btnMiddle && old_btnMiddle == true) this.AttachedMouse.bMiddleUp = true;
		if(old_btnRight != this.AttachedMouse.btnRight && old_btnRight == true) this.AttachedMouse.bRightUp = true;
	}
	
	OnMouseWheel(event)
	{
		if(this.AttachedMouse === undefined) return;
		if(this.AttachedMouse == null) return;
		
		let scale = 1.0;
		if(browser != undefined || browser != null){
			if(browser.isFirefox == true) scale = 1.0;
			else if(browser.isChrome == true) scale = 1.0/100.0;
		}
		
		if(event.wheelDelta != undefined)
			this.AttachedMouse.dz = scale*event.wheelDelta;
		else if(event.deltaMode != undefined && event.deltaMode == 1)
			this.AttachedMouse.dz = -scale*event.deltaY;
		else
			this.AttachedMouse.dz = 1; //ne znamo u kojem smijeru!
	}
	
	AttachTo(obj){		
		obj.onmousemove = this.OnMouseEvent;
		obj.onmouseenter = this.OnMouseEvent;
		obj.onmousedown = this.OnMouseEvent;
		obj.onmouseout = this.OnMouseEvent;
		obj.onmouseup = this.OnMouseEvent;
		obj.onwheel = this.OnMouseWheel;
		
		this.objAttached = obj;
		obj.AttachedMouse = this;
	}
	
	Update(){
		this.bLeftDown = false;
		this.bMiddleDown = false;
		this.bRightDown = false;		
		this.dx = 0;
		this.dy = 0;
		this.dz = 0;
		this.bLeftUp = false;
		this.bMiddleUp = false;
		this.bRightUp = false;
	}
	
	getPosition(){ return [this.x, this.y, this.z]; }
	getDeltaPosition(){ return [this.dx, this.dy, this.dz]; }
}

export var mouse = null;

export function InitMouse(obj){
	if(obj == null) obj = document;
	mouse = new CMouse();
	mouse.AttachTo(obj);
}

export function Update(){
	if(mouse != null) mouse.Update();
}
export function get(){
	return mouse;
}
export function getPosition(){
	if(mouse != null) return mouse.getPosition();
	return [0,0];
}
export function getDeltaPosition(){
	if(mouse != null) return mouse.getDeltaPosition();
	return [0,0];
}