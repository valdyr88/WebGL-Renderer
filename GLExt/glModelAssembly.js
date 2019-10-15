import { gl, glPrintError, CGLExtObject } from "./glContext.js";
// import * as global from "./globalStorage.js"
import * as sys from "./../System/sys.js"
import { CModel } from "./glModel.js";
import { CMaterialParam, CMaterial } from "./glMaterial.js";
import { CShader, CShaderList } from "./glShader.js";
import { CTexture, CTextureList } from "./glTexture.js";
import { CBlendMode } from "./glBlendMode.js"
import * as vMath from "../glMatrix/gl-matrix.js";

export class CModelAssembly extends CGLExtObject
{
	constructor(slotID)
	{
		super();
		this.id = "";
		this.src = "";
		this.models = [];
	}
	
	LoadAssemblyFromXML(asmid){
		let lnk = document.getElementById(asmid);
		if(lnk == null) return false;
		
		this.src = lnk.src.replace('\\','/');
		let folderPath = this.src.substr(0, this.src.lastIndexOf('/')+1);
		
		let parser = new DOMParser();
		let xmlAsm = parser.parseFromString(lnk.text, "text/xml");
		xmlAsm = xmlAsm.getElementsByTagName("assembly")[0];
		xmlAsm.getElementsByTagNameImmediate = sys.utils.getElementsByTagNameImmediate;
		
		this.id = xmlAsm.id;
		
		let imgs = xmlAsm.getElementsByTagNameImmediate("img");
		for(let i = 0; i < imgs.length; ++i){
			let img = imgs[i];
			let tx = CTextureList.getByName(folderPath + img.attributes.src.value);
			if(tx != null){
			}else{
				tx = new CTexture(-1);
				tx.CreateDelayed(folderPath + img.attributes.src.value, img.attributes.id.value);
				CTextureList.addTexture(tx);
			}
			img.value = tx;
		}
		
		let defaultMaterial = null;
		if(xmlAsm.getElementsByTagNameImmediate("material").length > 0){
			defaultMaterial = new CMaterial();
			defaultMaterial.LoadFromXMLDOM( xmlAsm.getElementsByTagNameImmediate("material")[0] );
		}
		
		let mdls = xmlAsm.getElementsByTagNameImmediate("model");		
		for(let i = 0; i < mdls.length; ++i){
			let mdl = mdls[i];
			mdl.getElementsByTagNameImmediate = sys.utils.getElementsByTagNameImmediate;
			
			let model = new CModel(0);
			
			model.DelayedImportFromPath(folderPath + mdl.attributes.src.value);
			
			let material = defaultMaterial;
			
			if( mdl.getElementsByTagNameImmediate("material").length > 0 ){
				material = new CMaterial();
				material.LoadFromXMLDOM( mdl.getElementsByTagNameImmediate("material")[0] );
			}
			
			model.setMaterial(material);
			
			let params = CMaterialParam.LoadParamsFromXMLDOM(mdl);
			model.setParams(params);
			
			this.models[this.models.length] = model;
		}
	}
}