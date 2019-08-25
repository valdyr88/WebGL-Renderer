// import * as glsh from "./glShader.js";
import { glInit, glEnableExtension, InitDebugTextDOM, WriteDebug, ResizeCanvas, gl, CGLExtObject } from "./glContext.js"
import { CShader, CShaderList, CShaderDefines } from "./glShader.js";
import { CModel, GenCubeModel, GenQuadModel, InitNDCQuadModel, NDCQuadModel } from "./glModel.js";
import { CTexture, CTextureCube, CTextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat } from "./glTexture.js"
import { CLight, CLightList, MAX_LIGHTS } from "./glLight.js"
import { CFramebuffer, CMipMapGen } from "./glFramebuffer.js"
import { CBlendMode } from "./glBlendMode.js"
import { CCamera } from "./glCamera.js"

// export { gl, glContextName, glExtensions, isWGL2 };
export * from "./GLExt.js";
//import * as glext from "./GLExt/GLExt.js"
// export { glsh };
export { CCamera };
export { CBlendMode };
export { CFramebuffer, CMipMapGen };
export { CLight, CLightList, MAX_LIGHTS };
export { CTexture, CTextureCube, CTextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat };
export { CModel, GenCubeModel, GenQuadModel, InitNDCQuadModel, NDCQuadModel };
export { CShader, CShaderList, CShaderDefines };
export { glInit, glEnableExtension, InitDebugTextDOM, WriteDebug, ResizeCanvas, gl, CGLExtObject };