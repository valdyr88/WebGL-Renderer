// import * as glsh from "./glShader.js";
import { glInit, glEnableExtension, InitDebugTextDOM, WriteDebug, ResizeCanvas, gl } from "./glContext.js"
import { CShader, CShaderList, CShaderDefines } from "./glShader.js";
import { CModel, GenCubeModel, GenQuadModel, CBlendMode, CBlendModeColorAttachments, InitNDCQuadModel, NDCQuadModel } from "./glModel.js";
import { BlendMode_AlphaBlend, BlendMode_Additive, BlendMode_SrcOverride, BlendMode_Default } from "./glModel.js";
import { CTexture, CTextureCube, CTextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat } from "./glTexture.js"
import { CLight, CLightList, MAX_LIGHTS } from "./glLight.js"
import { CFramebuffer, CMipMapGen } from "./glFramebuffer.js"
import { CCamera } from "./glCamera.js"

// export { gl, glContextName, glExtensions, isWGL2 };
export * from "./GLExt.js";
//import * as glext from "./GLExt/GLExt.js"
// export { glsh };
export { CCamera };
export { CFramebuffer, CMipMapGen };
export { CLight, CLightList, MAX_LIGHTS };
export { CTexture, CTextureCube, CTextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat };
export { BlendMode_AlphaBlend, BlendMode_Additive, BlendMode_SrcOverride, BlendMode_Default  };
export { CModel, GenCubeModel, GenQuadModel, CBlendMode, CBlendModeColorAttachments, InitNDCQuadModel, NDCQuadModel };
export { CShader, CShaderList, CShaderDefines };
export { glInit, glEnableExtension, InitDebugTextDOM, WriteDebug, ResizeCanvas, gl };