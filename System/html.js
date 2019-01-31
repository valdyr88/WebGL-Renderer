import * as fetch from "./fetch.js"


//----------------------------------------------------------------------------------------------------
// inline HTML file. potrebno je dodat attribut data-inline-html (moze i neki drugi isto) i pozvat ParseForHTMLIncludes(document, 'data-inline-html')
//----------------------------------------------------------------------------------------------------
class CInlineHTMLfileCounter{ constructor(){ this.counter = 0; } }

export function inlineHTMLfile(src, obj, counter, callback){
	fetch.fetchTextFileSrc(src, function(txt){
		var write_file = null;
		write_file = (typeof obj === 'string')? document.getElementById(obj) : obj;
		write_file.innerHTML = txt;
		--counter.counter;
		if(counter.counter == 0){
			callback();
		}
	});
}

function ParseForHTMLIncludes_impl(doc, strAttribute, counter, callback){
	//rekurzivna funkcija koja u prvoj for petlji traži <strAttribute> atribut u DOM elementima i povecava counter za svaki takav element
	//a zatim prolazi sve te elemente i poziva inlineHTMLfile() za svaki, sa tim da predaje callback funkciju koja rekurzivno poziva ponovno ParseForHTMLIncludes_impl()
	//rekurzija se zaustavi jednom kad pri prolazu kroz elemente nije postavljen bHadAttrib na true (tj nije bilo elementa sa <strAttribute> atributom.
	
	var bHadAttrib = false;
	{
		let elems = [];
		let elems_inline_html_file = [];
		let allElements = doc.getElementsByTagName("*");
		
		for(let i = 0; i < allElements.length; ++i)
		{
			let el = allElements[i];
			let file_src = el.getAttribute(strAttribute);
			if(file_src == null) continue;
			
			el.removeAttribute(strAttribute);
			elems[elems.length] = el;
			elems_inline_html_file[elems_inline_html_file.length] = file_src;
			++counter.counter;
			bHadAttrib = true;
		}
		for(let i = 0; i < elems.length; ++i)
		{
			let el = elems[i];
			let inline_html_file = elems_inline_html_file[i];
			
			inlineHTMLfile(inline_html_file, el, counter, 
				function(){
					ParseForHTMLIncludes_impl(doc, strAttribute, counter, callback); //zove rekurzivno, te ako ne bude novih elemenata zove callback()
				}
			);
		}
		if(bHadAttrib == false){ callback(); } //ako nije bilo elemenata, onda zovemo callback()
	}	
}

export function ParseForHTMLIncludes(doc, strAttribute, callback){
	if(strAttribute == undefined || strAttribute == null) strAttribute = "data-inline-html";
	var counter = new CInlineHTMLfileCounter();
	
	//poziva rekurzivnu funkciju
	ParseForHTMLIncludes_impl(doc, strAttribute, counter, callback);
}

//----------------------------------------------------------------------------------------------------


//----------------------------------------------------------------------------------------------------
// movable elements
//----------------------------------------------------------------------------------------------------

class CRect{
	constructor(X0,Y0,X1,Y1){
		this.x0 = X0;
		this.x1 = X1;
		this.y0 = Y0;
		this.y1 = Y1;
		this.width = X1-X0;
		this.height = Y1-Y0;
	}
	isWithin(x,y){
		return (x >= this.x0 && x <= this.x1 && y >= this.y0 && y <= this.y1);
	}
}

function movable_OnMouseDown(e){
	e = e || window.event;
	
	this.oldMouseX = e.clientX;
	this.oldMouseY = e.clientY;
	
	let thisRect = this.getBoundingClientRect();
	let localX = e.clientX - thisRect.left;//this.offsetLeft;
	let localY = e.clientY - thisRect.top; //this.offsetTop;
	let bInSelectRect = true;
	
	//provjera jeli unutar selection recta
	if(this.selectRect != null && this.selectRect.length != 0)
	{
		bInSelectRect = false;
		
		for(let i = 0; i < this.selectRect.length; ++i){
			let rect = this.selectRect[i];
			if(rect.isWithin(localX,localY) == true){ 
				bInSelectRect = true; break;
			}
		}
	}
	
	if(bInSelectRect == true){
		e.preventDefault();
		document.movable_temp_onmouseup = document.onmouseup; //hack kako se nebi izgubio mouse.OnMouseEvent()
		document.movable_temp_onmousemove = document.onmousemove; //hack kako se nebi izgubio mouse.OnMouseEvent()
		document.onmouseup = movable_StopMovement;
		document.onmousemove = movable_DragElement;
		document.movable_element = this;
	}
}

function movable_DragElement(e){
	e = e || window.event;
	e.preventDefault();
	if(document.movable_element == null) return;
	
	let dX = document.movable_element.oldMouseX - e.clientX;
	let dY = document.movable_element.oldMouseY - e.clientY;
	
	document.movable_element.style.top = (document.movable_element.offsetTop - dY) + "px";
	document.movable_element.style.left = (document.movable_element.offsetLeft - dX) + "px";
	
	document.movable_element.oldMouseX = e.clientX;
	document.movable_element.oldMouseY = e.clientY;
}

function movable_StopMovement(e){
	document.onmouseup = document.movable_temp_onmouseup;
	document.onmousemove = document.movable_temp_onmousemove;
	document.movable_element = null;
}

function movable_findMovableRectFromAttrib(obj, strAttribute){
	if(strAttribute == undefined || strAttribute == null) return;
	var allElements = obj.getElementsByTagName("*");
	
	var objRect = obj.getBoundingClientRect();
	var Rects = [];
	
	obj.movable_element_handle_attrib = strAttribute;
	obj.onresize = function(){ 
		obj.selectRect = movable_findMovableRectFromAttrib(obj, obj.movable_element_handle_attrib);
	}
	
	for(let i = 0; i < allElements.length; ++i)
	{
		let el = allElements[i];
		let bHasAttrib = el.getAttribute(strAttribute) != null;		
		if(bHasAttrib == false){ continue; }
		
		// el.removeAttribute(strAttribute);
		let elRect = el.getBoundingClientRect();
		
		let x0 = elRect.left - objRect.left;
		let x1 = x0 + elRect.width;
		let y0 = elRect.top - objRect.top;
		let y1 = y0 + elRect.height;
		
		el.onresize = function(){ 
			obj.selectRect = movable_findMovableRectFromAttrib(obj, obj.movable_element_handle_attrib);
		}
				
		Rects[Rects.length] = new CRect(x0,y0,x1,y1);
	}
	return Rects;	
}

/*
prima element <elem> kojem ce postaviti onmousedown handler za movement.
<handle> je ili attribut DOM elementa unutar <elem>, ili lista rect koordinata (relativno u odnosu na <elem> koje definiraju area koji pomiče element. ako ovaj parametar nije predan onda se element može pomaknut na bilo kojem mjestu
*/
export function MakeElementMovable(elem, handle){
	var obj = elem;
	if(typeof elem === 'string'){ obj = document.getElementById(elem); }
	if(obj == null) return;
	
	obj.onmousedown = movable_OnMouseDown;
	
	obj.oldMouseX = 0;
	obj.oldMouseY = 0;
	
	if(handle == null){
		obj.selectRect = [];}
	else if(typeof handle == 'string'){
		obj.selectRect = movable_findMovableRectFromAttrib(obj, handle);}
	else if(handle[0].length == undefined){
		obj.selectRect = [new CRect(handle[0],handle[1],handle[2],handle[3])];}
	else{
		obj.selectRect = [];
		for(let i = 0; i < handle.length; ++i){
			let r = handle[i];
			obj.selectRect[i] = new CRect(r[0],r[1],r[2],r[3]);
		}
	}
	
}

/*
prima elemente <elems> kojima ce postaviti onmousedown handler za movement.
<handle_attrib> je attribut pomocu kojeg se definira da taj element je handle za movement
*/
export function MakeElementsMovable(elems, handle_attrib){
	if(elems == null) return;
	if(typeof elems == 'string') MakeElementMovable(elems,handle_attrib);
	else{
		if(elems.length == undefined) MakeElementMovable(elems,handle_attrib);
		for(let i = 0; i < elems.length; ++i) MakeElementMovable(elems[i],handle_attrib);
	}
}

//----------------------------------------------------------------------------------------------------
//Check for browser
//https://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser/9851769
//https://github.com/arasatasaygin/is.js/blob/master/is.js

var browser = null;

export function CheckWhatBrowser()
{
    // cache some methods to call later on
    var toString = Object.prototype.toString;
    var slice = Array.prototype.slice;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    // helper function which compares a version to a range
    function compareVersion(version, range) {
        var string = (range + '');
        var n = +(string.match(/\d+/) || NaN);
        var op = string.match(/^[<>]=?|/)[0];
        return comparator[op] ? comparator[op](version, n) : (version == n || n !== n);
    }

    // helper function which extracts params from arguments
    function getParams(args) {
        var params = slice.call(args);
        var length = params.length;
        if (length === 1 && is.array(params[0])) {    // support array
            params = params[0];
        }
        return params;
    }	
	
    // helper function which reverses the sense of predicate result
    function not(func) {
        return function() {
            return !func.apply(null, slice.call(arguments));
        };
    }

    // helper function which call predicate function per parameter and return true if all pass
    function all(func) {
        return function() {
            var params = getParams(arguments);
            var length = params.length;
            for (var i = 0; i < length; i++) {
                if (!func.call(null, params[i])) {
                    return false;
                }
            }
            return true;
        };
    }


    // helper function which call predicate function per parameter and return true if any pass
    function any(func) {
        return function() {
            var params = getParams(arguments);
            var length = params.length;
            for (var i = 0; i < length; i++) {
                if (func.call(null, params[i])) {
                    return true;
                }
            }
            return false;
        };
    }

    // build a 'comparator' object for various comparison checks
    var comparator = {
        '<': function(a, b) { return a < b; },
        '<=': function(a, b) { return a <= b; },
        '>': function(a, b) { return a > b; },
        '>=': function(a, b) { return a >= b; }
    };
	
    // Environment checks
    /* -------------------------------------------------------------------------- */
	
	browser = ["BrowserType"];

    // is a given value window?
    // setInterval method is only available for window object
    browser.windowObject = function(value) {
        return value != null && typeof value === 'object' && 'setInterval' in value;
    };

    var freeGlobal = browser.windowObject(typeof global == 'object' && global) && global;
    var freeSelf = browser.windowObject(typeof self == 'object' && self) && self;
    var thisGlobal = browser.windowObject(typeof this == 'object' && this) && this;
    var root = freeGlobal || freeSelf || thisGlobal || Function('return this')();

    var document = freeSelf && freeSelf.document;
    var previousIs = root.browser;
	
    // store navigator properties to use later
    var navigator = freeSelf && freeSelf.navigator;
    var platform = (navigator && navigator.platform || '').toLowerCase();
    var userAgent = (navigator && navigator.userAgent || '').toLowerCase();
    var vendor = (navigator && navigator.vendor || '').toLowerCase();
	
    // is current device android?
    browser.android = function() {
        return /android/.test(userAgent);
    };
    // is current device android phone?
    browser.androidPhone = function() {
        return /android/.test(userAgent) && /mobile/.test(userAgent);
    };

    // is current device android tablet?
    browser.androidTablet = function() {
        return /android/.test(userAgent) && !/mobile/.test(userAgent);
    };

    // is current device blackberry?
    browser.blackberry = function() {
        return /blackberry/.test(userAgent) || /bb10/.test(userAgent);
    };

    // is current browser chrome?
    // parameter is optional
    browser.chrome = function(range) {
        var match = /google inc/.test(vendor) ? userAgent.match(/(?:chrome|crios)\/(\d+)/) : null;
        return match !== null && !browser.opera() && compareVersion(match[1], range);
    };

    // is current device desktop?
    browser.desktop = function() {
        return !browser.mobile() && !browser.tablet();
    };

    // is current browser edge?
    // parameter is optional
    browser.edge = function(range) {
        var match = userAgent.match(/edge\/(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current browser firefox?
    // parameter is optional
    browser.firefox = function(range) {
        var match = userAgent.match(/(?:firefox|fxios)\/(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current browser internet explorer?
    // parameter is optional
    browser.ie = function(range) {
        var match = userAgent.match(/(?:msie |trident.+?; rv:)(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current device ios?
    browser.ios = function() {
        return browser.iphone() || browser.ipad() || browser.ipod();
    };

    // is current device ipad?
    // parameter is optional
    browser.ipad = function(range) {
        var match = userAgent.match(/ipad.+?os (\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current device iphone?
    // parameter is optional
    browser.iphone = function(range) {
        // avoid false positive for Facebook in-app browser on ipad;
        // original iphone doesn't have the OS portion of the UA
        var match = browser.ipad() ? null : userAgent.match(/iphone(?:.+?os (\d+))?/);
        return match !== null && compareVersion(match[1] || 1, range);
    };
    // is current device ipod?
    // parameter is optional
    browser.ipod = function(range) {
        var match = userAgent.match(/ipod.+?os (\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current operating system linux?
    browser.linux = function() {
        return /linux/.test(platform) && !browser.android();
    };

    // is current operating system mac?
    browser.mac = function() {
        return /mac/.test(platform);
    };

    // is current device mobile?
    browser.mobile = function() {
        return browser.iphone() || browser.ipod() || browser.androidPhone() || browser.blackberry() || browser.windowsPhone();
    };

    // is current state online?
    browser.online = function() {
        return !navigator || navigator.onLine === true;
    };

    // is current state offline?
    browser.offline = !(browser.online());

    // is current browser opera?
    // parameter is optional
    browser.opera = function(range) {
        var match = userAgent.match(/(?:^opera.+?version|opr)\/(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current browser opera mini?
    // parameter is optional
    browser.operaMini = function(range) {
        var match = userAgent.match(/opera mini\/(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current browser phantomjs?
    // parameter is optional
    browser.phantom = function(range) {
        var match = userAgent.match(/phantomjs\/(\d+)/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current browser safari?
    // parameter is optional
    browser.safari = function(range) {
        var match = userAgent.match(/version\/(\d+).+?safari/);
        return match !== null && compareVersion(match[1], range);
    };

    // is current device tablet?
    browser.tablet = function() {
        return browser.ipad() || browser.androidTablet() || browser.windowsTablet();
    };

    // is current device supports touch?
    browser.touchDevice = function() {
        return !!document && ('ontouchstart' in freeSelf ||
            ('DocumentTouch' in freeSelf && document instanceof DocumentTouch));
    };

    // is current operating system windows?
    browser.windows = function() {
        return /win/.test(platform);
    };

    // is current device windows phone?
    browser.windowsPhone = function() {
        return browser.windows() && /phone/.test(userAgent);
    };

    // is current device windows tablet?
    browser.windowsTablet = function() {
        return browser.windows() && !browser.windowsPhone() && /touch/.test(userAgent);
    };
	// var isOpera = false;
	// var isFirefox = false;
	// var isSafari = false;
	// var isIE = false;
	// var isEdge = false;
	// var isChrome = false;
	// var isBlink = false;

	browser.isOpera = browser.opera() || browser.operaMini();
	browser.isSafari = browser.safari();
	browser.isChrome = browser.chrome();
	browser.isFirefox = browser.firefox();
	browser.isIE = browser.ie();
	browser.isEdge = browser.edge();
}

export {browser};






