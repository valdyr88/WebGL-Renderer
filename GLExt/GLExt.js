// import * as glsh from "./glShader.js";
import { glInit, glEnableExtension, isWGL2, InitDebugTextDOM, WriteDebug, ResizeCanvas } from "./glContext.js"
import { Shader, ShaderList, ShaderDefines } from "./glShader.js";
import { Model, GenCubeModel, GenQuadModel, BlendMode, BlendModeColorAttachments } from "./glModel.js";
import { BlendMode_AlphaBlend, BlendMode_Additive, BlendMode_SrcOverride, BlendMode_Default } from "./glModel.js";
import { Texture, TextureCube, TextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat } from "./glTexture.js"
import { Light, LightList, MAX_LIGHTS } from "./glLight.js"
import { Framebuffer, MipMapGen } from "./glFramebuffer.js"
import { Camera } from "./glCamera.js"

// export { gl, glContextName, glExtensions, isWGL2 };
export * from "./GLExt.js";
//import * as glext from "./GLExt/GLExt.js"
// export { glsh };
export { Camera };
export { Framebuffer, MipMapGen };
export { Light, LightList, MAX_LIGHTS };
export { Texture, TextureCube, TextureList, CalcNofMipLevels, FormatFromInternalFormat, TypeFromInternalFormat };
export { BlendMode_AlphaBlend, BlendMode_Additive, BlendMode_SrcOverride, BlendMode_Default  };
export { Model, GenCubeModel, GenQuadModel, BlendMode, BlendModeColorAttachments };
export { Shader, ShaderList, ShaderDefines };
export { glInit, glEnableExtension, InitDebugTextDOM, WriteDebug, ResizeCanvas };