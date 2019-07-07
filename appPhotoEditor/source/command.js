import * as glext from "./../../GLExt/GLExt.js"
import * as sys from "./../../System/sys.js"
import * as vMath from "./../../glMatrix/gl-matrix.js";

/*
command pattern
	every (user) interaction needs to be recorded into "command" object
	"command" object holds info about:
		- which photo document (by document id)
		- what object type (CBrush, CLayer, ...)
		- what command (which method in object to call, or even if to create/delete object with new/delete)
		- what command parameters (i.e. mouse status, what setting value to change to...)
		- previous parameters (if applicible) (i.e. for setting change, record what previous value was set)
*/

//----------------------------------------------------------------------

export class CParam{
	
	constructor(){
		this.type = null;
		this.value = null;
		this.count = 0;
	}
	
	set(param){
		
		if(param.length == undefined || typeof(param) == "string" || typeof(param) == "function"){
			this.type = CParam.DecideParamType(param);
			this.value = param;
			this.count = 1;
		}
		else{
			let paramType = CParam.DecideParamType(param[0]);
			let bIsArray = false;
			
			if(paramType == CParam.Type_number){
				if(param.length == 2)
					this.type = CParam.Type_vec2;
				if(param.length == 3)
					this.type = CParam.Type_vec3;
				if(param.length == 4)
					this.type = CParam.Type_vec4;
				if(param.length >= 5){
					this.type = CParam.Type_numArray; bIsArray = true; }
				this.count = 1;
			}
			if(paramType == CParam.Type_string){
				this.type = CParam.Type_stringArray; bIsArray = true; }
			if(paramType == CParam.Type_bool){
				this.type = CParam.Type_boolArray; bIsArray = true; }
			if(paramType == CParam.Type_funct){
				this.type = CParam.Type_functArray; bIsArray = true; }
			if(paramType == CParam.Type_object){
				this.type = CParam.Type_objectArray; bIsArray = true; }
			
			//-----------------------------------------------------------
			
			if(bIsArray == true){
				this.count = param.length; }
			else{
				this.count = 1; }
			
			this.value = [];
			for(let i = 0; i < param.length; ++i){
				this.value[i] = param[i]; 
			}
		}
	}
	
	static DecideParamType(param){
		if(typeof(param) == "number")
			return CParam.Type_number;
		if(typeof(param) == "string")
			return CParam.Type_string;
		if(typeof(param) == "boolean")
			return CParam.Type_bool;
		if(typeof(param) == "object")
			return CParam.Type_object;
		if(typeof(param) == "function")
			return CParam.Type_funct;
		if(typeof(param) == "undefined")
			return CParam.Type_void;		
	}
}

CParam.Type_void = 0;
CParam.Type_bool = 1;
CParam.Type_number = 2;
CParam.Type_string = 3;
CParam.Type_vec2 = 4;
CParam.Type_vec3 = 5;
CParam.Type_vec4 = 6;
CParam.Type_object = 7;
CParam.Type_funct = 8;

CParam.Type_boolArray = 1001;
CParam.Type_numArray = 1002;
CParam.Type_stringArray = 1003;
CParam.Type_vec2Array = 1004;
CParam.Type_vec3Array = 1005;
CParam.Type_vec4Array = 1006;
CParam.Type_objectArray = 1007;
CParam.Type_functArray = 1008;

export class CCommandParams{
	
	constructor(){
		this.type = "CCommandParams";
		this.params = [];
	}
	
	add(param){
		let cparam = new CParam();
		cparam.set(param);
		this.params[this.params.length] = cparam;
	}
}

//----------------------------------------------------------------------

export class CCommand{
	
	constructor(){
		this.type = "CCommand";
		this.objectId = "none";
		this.objectType = "none";
		this.command = "none";
		this.commandParams = null;
		++CCommand.createdCount;
		this.commandId = CCommand.createdCount;
	}
	
	getObjectType(){ return this.objectType; }
	getObjectId(){ return this.objectId; }
	getCommandType(){ return this.command; }
	getCommandParams(){ return this.commandParams.params; }
	
	set(){ //objId, objType, cmd
		this.objectId = arguments[0];
		this.objectType = arguments[1];
		this.command = arguments[2];
		
		if(arguments.length > 3){
			this.commandParams = new CCommandParams();
			for(let i = 3; i < arguments.length; ++i){
				this.commandParams.add(arguments[i]);
			}
		}
	}
}

CCommand.createdCount = 0;

//----------------------------------------------------------------------

export class ICommandExecute{
	
	constructor(){ 
		this.type = "ICommandExecute";
		++ICommandExecute.createdCount;
		this.objectId = ICommandExecute.createdCount;
	}
	
	setType(typ){ this.type = typ; }
	
	exec(){ console.log(this.type + "::exec() not implemented!, objectId == " + this.objectId); }
	
	SaveAsCommand(){ console.log(this.type + "::SaveAsCommand() not implemented!, objectId == " + this.objectId); return null; }
	LoadFromCommand(cmd){ console.log(this.type + "::LoadFromCommand() not implemented!, objectId == " + this.objectId); return false; }
}

ICommandExecute.createdCount = 0;