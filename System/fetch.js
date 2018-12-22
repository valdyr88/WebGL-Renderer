
function extractTypeFromOuterHTML(obj){
	var strArray = obj.outerHTML.split("type");
	if(strArray.length < 2) return false;
	var strTypeArray = strArray[1].split("\"");
	if(strTypeArray.length < 2) return false;
	obj.type = strTypeArray[1]; return true;		
}
	
export function fetchTextFile(obj, callback){
	if(typeof obj === 'string'){
		var id = obj;
		obj = document.getElementById(id);
		if(obj == null) alert("fetchTextFile() obj == null, id == " + id);
		if(typeof obj.type === 'undefined' || obj.type == null)
			extractTypeFromOuterHTML(obj);
	}
	
	var header = new Headers();
	header.append('pragma', 'no-cache');
	header.append('cache-control', 'no-cache');
	
	var init = { method: 'GET', headers: header, };
	
	fetch(obj.src, init).then(
		function(response){
			response.text().then(
				function(text){
					obj.text = text;
					callback(obj.id);
				}
			);
		}
	);	
}

export function fetchTextFileSrc(src, callback){
	
	var header = new Headers();
	header.append('pragma', 'no-cache');
	header.append('cache-control', 'no-cache');
	
	var init = { method: 'GET', headers: header, };
	
	fetch(src, init).then(
		function(response){
			response.text().then(
				function(text){
					callback(text);
				}
			);
		}
	);	
}
