import * as fetch from "./fetch.js"
/* 
export function inlineHTMLfile(id,write_id){
	var strHTML = null;
	
	var file = document.getElementById(id);
	var write_file = document.getElementById(write_id);
	if(write_file == null) return;
	if(write_file.innerHTML == undefined) return;
	
	if(file != null){
		if(file.value != undefined)
			strHTML = file.value;
		else if(file.text != undefined && file.text != "")
			strHTML = file.text;
		else{
			fetch.fetchTextFile(id, function(fid){
				var file = document.getElementById(fid);
				// document.write(file.text);
				write_file.innerHTML = file.text;
			});			
			return;}
	}
	else if(id.value != undefined){
		strHTML = id.value; }
	else if(id.text != undefined){
		strHTML = id.text; }
	else
		return;	
	
	// document.write(strHTML);
	write_file.innerHTML = strHTML;
}
 */

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