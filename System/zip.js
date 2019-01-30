
import * as jsZip from "./jszip/dist/jszip.js"

var bSupportsUint8Array = JSZip.support.uint8array;

export class CFile{
	constructor(file_name, full_file_path, file_data){
		this.name = file_name;
		this.data = file_data;
		this.path = full_file_path;
		this.parentDir = null;
	}
}

export class CDir{
	constructor(dir_name){
		this.name = dir_name;
		this.dirs = [];
		this.files = [];
		this.parentDir = null;
	}
	
	addDir(dir){
		this.dirs[this.dirs.length] = dir;
		dir.parentDir = this;
		
	}
	
	addNewDir(dir_name){
		var dir = new CDir(dir_name);
		this.addDir(dir);
		return dir;
	}
	
	addFile(file){
		this.files[this.files.length] = file;
		file.parentDir = this;
	}
	
	addNewFile(file_name, file_path, file_data){
		var file = new CFile(file_name, file_path, file_data);
		this.addFile(file);
		return file;
	}
	
	getDirID(dir_name){
		for(var d = 0; d < this.dirs.length; ++d){
			if(this.dirs[d].name == dir_name)
				return d;
		}
		return -1;
	}
	
	getDir(dir_name){
		var d = this.getDirID(dir_name);
		if(d == -1) return null;
		return this.dirs[d];
	}
}

export class CZip
{	
	constructor()
	{	
		this.contents = null;
		this.rawzip = null;
		this.name = "";
		this.bUnpacked = false;
		this.fileCount = 0;
	}
	
	private_InsertFolderOrFile(zipEntry, bIsFolder, relativePath, maxZipEntryCount, callback){
		relativePath = relativePath.trim();
		// var bIsFolder = relativePath.lastIndexOf("/") == relativePath.length;
		
		var strPth = relativePath.split("/");
		if(strPth[strPth.length-1] == "")
			strPth.pop();
		
		var thisPtr = this;
		var folder = this.contents; var f = 0;
		
		for(f = 0; f < strPth.length-1; ++f){
			var gotfolder = folder.getDir(strPth[f]);
			if(gotfolder == null){ break; }
			folder = gotfolder;
		}
		
		for(f; f < strPth.length; ++f){
			if(f < strPth.length-1 || bIsFolder){ //dodavamo samo foldere
				folder = folder.addNewDir(strPth[f]);
			}
			else{//trebao bi biti sada file
				if(bSupportsUint8Array == true){
					var fileName = strPth[f];
					zipEntry.async("uint8array").then(
						function(data){
							folder.addNewFile(fileName, zipEntry.name, data);
							++thisPtr.fileCount;
							
							if(thisPtr.fileCount == maxZipEntryCount){
								thisPtr.bUnpacked = true;
								if(callback !== undefined) callback(thisPtr);
							}
						}
					);
				}
				else{
					alert("Zip: uint8array not supported!"); //treba konvertat string u uin8array nekako
				}
			}
		}
		
	}
	
	private_FillZipData(zip, callback){
		this.contents = new CDir("");
		this.bUnpacked = false;
		this.fileCount = 0;
		
		var thisPtr = this;
		var zipFileCount = 0;
		zip.forEach(function(relativePath, zipEntry){ if(zipEntry.dir == false) ++zipFileCount; });
		
		zip.forEach(
			function(relativePath, zipEntry){
				thisPtr.private_InsertFolderOrFile(zipEntry, zipEntry.dir, relativePath, zipFileCount, callback);
			}
		);	
	}
	
	
	AsyncUnpack(file_data, callback){
		this.rawzip = file_data;
		var thisPtr = this;
		
		this.bUnpacked = false;
		this.fileCount = 0;

		JSZip.loadAsync(file_data).then(
			function(zip){
				thisPtr.private_FillZipData(zip, callback);
			}						
		);
	}
		
	AsyncFetchAndLoadFile(file_path, bNoCache, callback)
	{
		var thisPtr = this;
		
		this.bUnpacked = false;
		this.fileCount = 0;
		this.name = file_path;
		
		var header = new Headers();
		if(bNoCache !== undefined && bNoCache === true){
			header.append('pragma', 'no-cache');
			header.append('cache-control', 'no-cache');
		}
		
		var init = { method: 'GET', headers: header, };		
		
		fetch(file_path, init).then(
			function(response){
				response.arrayBuffer().then(
					function(buffer){
						thisPtr.AsyncUnpack(buffer, callback);
					}
				);
			}
		);
	}
	
	isUnpacked(){ return this.bUnpacked; }
}