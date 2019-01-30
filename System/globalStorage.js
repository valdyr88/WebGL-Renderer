//storage of global data objects

var globalStorage = null;

class CGlobalStorageKeyData
{
	constructor(k, d)
	{
		this.keyword = k;
		this.data = d;
	}
}

export class CStorageElement
{
	constructor(storeID, Type, Data){
		this.id = storeID;
		this.type = Type;
		this.value = Data;
	}
}

export class CGlobalStorage
{
	constructor()
	{
		this.list = [];
	}
	
	static getSingleton(){
		if(globalStorage == null){
			globalStorage = new CGlobalStorage();
		}
		return globalStorage;
	}
	
	static add(keyword, data){
		var gs = CGlobalStorage.getSingleton();
		gs.list[gs.list.length] = new CGlobalStorageKeyData(keyword, data);
	}
	
	static get(keyword){
		var gs = CGlobalStorage.getSingleton();
		for(var i = 0; i < gs.list.length; ++i){
			if(gs.list[i].keyword == keyword)
				return gs.list[i].data;
		}
		return null;
	}
	
	static has(keyword){
		var gs = CGlobalStorage.getSingleton();
		for(var i = 0; i < gs.list.length; ++i){
			if(gs.list[i].keyword == keyword) return true;
		}
		return false;
	}
	
	static idOf(keyword){
		var gs = CGlobalStorage.getSingleton();
		for(var i = 0; i < gs.list.length; ++i){
			if(gs.list[i].keyword == keyword) return i;
		}
		return -1;
	}
	
	static getById(id){
		var gs = CGlobalStorage.getSingleton();
		if(id >= gs.list.length) return null;
		return gs.list[id].data;
	}
	
	/* static remove(keyword){
		var gs = CGlobalStorage.getSingleton();
		var i = CGlobalStorage.idOf(keyword);
		gs.list[i] = gs.list[gs.list.length-1];
		gs.list[gs.list.length-1] = null;
	} */
	
	Update(){}
	
	ClearAll(){
		this.list = null;
	}
	
	static Delete(){
		globalStorage.ClearAll();
		globalStorage = null;
	}
}