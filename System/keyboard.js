
export class Keyboard{

	constructor()
	{
		this.lastKeyPressed = -1;
		this.keysPressed = [];
		this.shiftPressed = false;
		this.ctrlPressed = false;
		this.altPressed = false;
		this.objAttached = null;
	}
	
	OnKeyPress(e)
	{
		if(this.AttachedKeyboard === undefined) return;
		if(this.AttachedKeyboard == null) return;
		
		var keynum = -1;
		
		if(window.event){ // IE                    
			keynum = e.keyCode;
		} else if(e.key){ // Netscape/Firefox/Opera                   
			keynum = e.key;
		}
		
		this.AttachedKeyboard.lastKeyPressed = keynum;
		this.AttachedKeyboard.keysPressed[keynum] = true;
		this.AttachedKeyboard.shiftPressed = e.shiftKey;
		this.AttachedKeyboard.ctrlPressed = e.ctrlKey;
		this.AttachedKeyboard.altPressed = e.altKey;
	}
	
	AttachTo(obj){
		obj.onkeypress = this.OnKeyPress;
		
		this.objAttached = obj;
		obj.AttachedKeyboard = this;
	}
	
	Update(){
		this.lastKeyPressed = -1;
		for(var i = 0; i < this.keysPressed.length; ++i) this.keysPressed[i] = false;
		this.shiftPressed = false;
		this.ctrlPressed = false;
		this.altPressed = false;
	}
	
	getLastPressedKey(){ return this.lastKeyPressed; }
	
	isKeyPressed(key){
		var keyCode = -1;
		
		if(typeof key == "string") keyCode = key.charCodeAt(0);
		else keyCode = key;
		
		if(keyCode < this.keysPressed.length)
			return this.keysPressed[keyCode];
		
		return false;
	}
	
	isKeyPressedCI(key){ //Case insensitive
		if(typeof key == "string") return this.isKeyPressed(key.toLowerCase()) || this.isKeyPressed(key.toUpperCase());
		else return this.isKeyPressed(key);
	}
	
	isShiftPressed(){ return this.shiftPressed; }
	isCtrlPressed(){ return this.ctrlPressed; }
	isAltPressed(){ return this.altPressed; }
}

export var keyboard = null;

export function InitKeyboard(obj){
	if(obj == null) obj = document;
	keyboard = new Keyboard();
	keyboard.AttachTo(obj);
}

export function Update(){
	if(keyboard != null) keyboard.Update();
}
export function get(){
	return keyboard;
}
export function getLastPressedKey(){
	if(keyboard != null) return keyboard.getLastPressedKey();
	return -1;
}
export function isKeyPressed(keyCode){
	if(keyboard != null) return keyboard.isKeyPressedCI(keyCode);
	return false;
}
export function isShiftPressed(){
	if(keyboard != null) return keyboard.isShiftPressed();
	return false;
}
export function isCtrlPressed(){
	if(keyboard != null) return keyboard.isCtrlPressed();
	return false;
}
export function isAltPressed(){
	if(keyboard != null) return keyboard.isAltPressed();
	return false;
}








