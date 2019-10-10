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
		
		this.id = xmlAsm.getElementsByTagName("assembly")[0].id;
		
		let imgs = xmlAsm.getElementsByTagName("img");
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
		
		let mdls = xmlAsm.getElementsByTagName("model");		
		for(let i = 0; i < mdls.length; ++i){
			let mdl = mdls[i];
			let model = new CModel(0);
			
			model.DelayedImportFromPath(folderPath + mdl.attributes.src.value);
			
			let material = new CMaterial();
			material.LoadFromXMLDOM( mdl.getElementsByTagName("material")[0] );
			
			model.setMaterial(material);
			
			this.models[this.models.length] = model;
		}
	}
}