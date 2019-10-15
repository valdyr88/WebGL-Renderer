
export function getGrandchild(obj, ids){

	for(var i = 0; i < ids.length; ++i){
		var id = ids[i];
		for(var j = 0; j < obj.childNodes.length; ++j){
			var o = obj.childNodes[j];
			if(o.id == id){ obj = o; break; }
		}
	}
	
	return obj;
}

export function getChild(obj, id){

	for(var j = 0; j < obj.childNodes.length; ++j){
		var o = obj.childNodes[j];
		if(o.id == id){ obj = o; break; }
	}
	return obj;
}

export function getGrandparent(obj, ids){
	
	for(var i = 0; i < ids.length; ++i){
		var id = ids[i];
		var o = obj.parentNode;
		if(o.id == id){ obj = o; }
		else break;
	}
	
	return obj;
}

export function getChildPosition(obj, id){

	for(var j = 0; j < obj.childNodes.length; ++j){
		var o = obj.childNodes[j];
		if(o.id == id){ return j; }
	}
	return -1;
}


function traverseAndGetChildElement(obj, ids){
	/*for(var id in ids){
		for(var o in obj.childNodes){
			if(o.id == id){ obj = o; break; }
		}
	}*/
	for(var i = 0; i < ids.length; ++i){
		var id = ids[i];
		for(var j = 0; j < obj.childNodes.length; ++j){
			var o = obj.childNodes[j];
			if(o.id == id){ obj = o; break; }
		}
	}
	
	return obj;
}

export function getAllByPropertyFrom(obj, func){
	
	let match = [];
	let list = [];
	let listElementProcessedId = 0;
	
	while(true){
		
		if(func(obj) == true)
			match[match.length] = obj;
			
		for(let i = 0; i < obj.childNodes.length; ++i){
			let c = obj.childNodes[i];
			if(func(c) == true)
				match[match.length] = c;
			for(let j = 0; j < c.childNodes.length; ++j){
				list[list.length] = c.childNodes[j];
			}
		}
		
		if(listElementProcessedId == list.length)
			break;		
		else{
			obj = list[listElementProcessedId];
			++listElementProcessedId;
		}
	}
	
	return match;
}

export function getAllByClassFrom(obj, classId){
	return getAllByPropertyFrom(obj, function(o){
		return (o.className == classId);
	});
}

export function getAllByTagName(obj, tagName){
	return getAllByPropertyFrom(obj, function(o){
		return (o.tagName == tagName);
	});
}

export function getElementsByTagNameImmediate(tag){
	
	var nodes = this.childNodes;
	nodes = Array.prototype.slice.call(nodes);
	nodes = nodes.filter(function(v, i){
			return v.tagName == tag; });
	return nodes;
}