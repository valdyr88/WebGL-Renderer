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
		let globalMaterials = [];
		let xmlDefaultMaterials = xmlAsm.getElementsByTagNameImmediate("material");
		
		if(xmlDefaultMaterials.length > 0){
			for(let i = 0; i < xmlDefaultMaterials.length; ++i){
				globalMaterials[i] = new CMaterial();
				globalMaterials[i].LoadFromXMLDOM( xmlAsm.getElementsByTagNameImmediate("material")[i] );
			}
			defaultMaterial = globalMaterials[0];
		}
		
		let mdls = xmlAsm.getElementsByTagNameImmediate("model");		
		let matLinks = [];
		for(let i = 0; i < mdls.length; ++i){
			let mdl = mdls[i];
			mdl.getElementsByTagNameImmediate = sys.utils.getElementsByTagNameImmediate;
			
			let model = new CModel(0);
			
			model.DelayedImportFromPath(folderPath + mdl.attributes.src.value);
			
			let material = defaultMaterial;
			
			if( mdl.getElementsByTagNameImmediate("material").length > 0 ){
				material = new CMaterial();
				if(material.LoadFromXMLDOM( mdl.getElementsByTagNameImmediate("material")[0] ) == false)//if false it's material link
					matLinks[matLinks.length] = this.models.length;
			}
			
			model.setMaterial(material);
			
			let params = CMaterialParam.LoadParamsFromXMLDOM(mdl);
			model.setParams(params);
			
			this.models[this.models.length] = model;
		}
		
		//material linking
		for(let i = 0; i < matLinks.length; ++i){
			let model = this.models[matLinks[i]];
			
			let material = null;
			for(let m = 0; m < globalMaterials.length; ++m){
				if(globalMaterials[m].id == model.material.id){
					material = globalMaterials[m];
					break;
				}
			}
			if(material == null)
			for(let m = 0; m < this.models.length; ++m){
				if(m == matLinks[i]) continue;
				
				if(model.material.id == this.models[m].material.id && this.models[m].material.isMaterialLink() == false){
					material = this.models[m].material;
					break;
				}
			}
			
			if(material === null){
				alert("LoadAssemblyFromXML(): material link not found! <" + model.material.id + ">");
				continue;
			}
			
			model.material.LinkFromMaterial(material);
			model.setMaterial(model.material);
		}
	}
}