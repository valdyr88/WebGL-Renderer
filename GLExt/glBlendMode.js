import { gl, glPrintError, setOpenGLInitCallbacks, CGLExtObject } from "./glContext.js";
import * as vMath from "../glMatrix/gl-matrix.js";
import { CShader, CUniformBlockBuffer, CUniformBlockBinding } from "./glShader.js";
import { CFramebuffer } from "./glFramebuffer.js";

export class CBlendMode extends CGLExtObject{
	
	static Zero(){ 					return CBlendMode.zero; }
	static One(){					return CBlendMode.one; }
	static SrcColor(){				return CBlendMode.src_color; }
	static OneMinusSrcColor(){		return CBlendMode.one_minus_src_color; }
	static DstColor(){				return CBlendMode.dst_color; }
	static OneMinusDstColor(){		return CBlendMode.one_minus_dst_color; }
	static SrcAlpha(){				return CBlendMode.src_alpha; }
	static OneMinusSrcAlpha(){		return CBlendMode.one_minus_src_alpha; }
	static DstAlpha(){				return CBlendMode.dst_alpha; }
	static OneMinusDstAlpha(){		return CBlendMode.one_minus_dst_alpha; }
	static ConstantColor(){			return CBlendMode.constant_color; }
	static OneMinusConstantColor(){ return CBlendMode.one_minus_constant_color; }
	static ConstantAlpha(){			return CBlendMode.constant_alpha; }
	static OneMinusConstantAlpha(){ return CBlendMode.one_minus_constant_alpha; }
	
	static EqAdd(){				return CBlendEquation.add; }
	static EqSubtract(){  		return CBlendEquation.subtract; }
	static EqReverseSubtract(){	return CBlendEquation.reverse_subtract; }
	static EqMin(){				return CBlendEquation.min; }
	static EqMax(){				return CBlendEquation.max; }
	
	static Init(){
		CBlendMode.zero = gl.ZERO;
		CBlendMode.one = gl.ONE;
		CBlendMode.src_color = gl.SRC_COLOR;
		CBlendMode.one_minus_src_color = gl.ONE_MINUS_SRC_COLOR;
		CBlendMode.dst_color = gl.DST_COLOR;
		CBlendMode.one_minus_dst_color = gl.ONE_MINUS_DST_COLOR;
		CBlendMode.src_alpha = gl.SRC_ALPHA;
		CBlendMode.one_minus_src_alpha = gl.ONE_MINUS_SRC_ALPHA;
		CBlendMode.dst_alpha = gl.DST_ALPHA;
		CBlendMode.one_minus_dst_alpha = gl.ONE_MINUS_DST_ALPHA;
		CBlendMode.constant_color = gl.CONSTANT_COLOR;
		CBlendMode.one_minus_constant_color = gl.ONE_MINUS_CONSTANT_COLOR;
		CBlendMode.constant_alpha = gl.CONSTANT_ALPHA;
		CBlendMode.one_minus_constant_alpha = gl.ONE_MINUS_CONSTANT_ALPHA;
		CBlendMode.src_alpha_saturate = gl.SRC_ALPHA_SATURATE;

		CBlendEquation.add = gl.FUNC_ADD;
		CBlendEquation.subtract = gl.FUNC_SUBTRACT;
		CBlendEquation.reverse_subtract = gl.FUNC_REVERSE_SUBTRACT;
		CBlendEquation.min = gl.MIN;
		CBlendEquation.max = gl.MAX;
		
		var BM = CBlendMode;
		var BE = CBlendEquation;

		CBlendMode.None = null;
		CBlendMode.Alpha = new CBlendMode(BM.src_alpha, BM.one_minus_src_alpha); CBlendMode.Alpha.setEquation(BE.add);
		CBlendMode.StoreAlpha = new CBlendMode(BM.src_alpha, BM.one_minus_src_alpha, BM.one, BM.one_minus_src_alpha, BE.add);
		CBlendMode.ReplaceColor = new CBlendMode(BM.one, BM.zero, BM.one, BM.one_minus_src_alpha, BE.add); CBlendMode.ReplaceColor.setEquation(BE.add);
		CBlendMode.ReplaceAll = new CBlendMode(BM.one, BM.zero); CBlendMode.ReplaceAll.setEquation(BE.add);
		CBlendMode.Additive = new CBlendMode(BM.one, BM.one); CBlendMode.Additive.setEquation(BE.add);
		// CBlendMode.TestMode = new CBlendMode(BM.one_minus_dst_alpha, BM.one_minus_src_alpha, BM.one, BM.one); CBlendMode.TestMode.setEquation(BE.add);
		CBlendMode.TestMode = new CBlendMode(BM.src_alpha, BM.one_minus_src_alpha); CBlendMode.TestMode.setEquation(BE.add);
		CBlendMode.Max = new CBlendMode(BM.one, BM.one); CBlendMode.Max.setEquation(BE.max);
	}
	
	constructor(srcc, dstc, srca, dsta, eq){
		super();
		if(srcc != undefined){
			if(srca == undefined) srca = srcc;
			if(dsta == undefined) dsta = dstc;
			
			this.src_color = srcc;
			this.src_alpha = srca;
			this.dst_color = dstc;
			this.dst_alpha = dsta;
			this.enabled = true;
		}else{
			this.src_color = 0;
			this.src_alpha = 0;
			this.dst_color = 0;
			this.dst_alpha = 0;
			this.enabled = false;
		}
		if(eq == undefined)
			this.equation = CBlendEquation.add;
		else
			this.equation = eq;
	}
	
	set(srcc, dstc, srca, dsta, eq){
		if(srca == undefined) srca = srcc;
		if(dsta == undefined) dsta = dstc;
		
		this.src_color = srcc;
		this.src_alpha = srca;
		this.dst_color = dstc;
		this.dst_alpha = dsta;
		this.enabled = true;
		
		if(eq == undefined)
			this.equation = CBlendEquation.add;
		else
			this.equation = eq;
	}
	
	setEquation(eq){
		this.equation = eq;
	}
	
	setBlendMode(b){
		this.set(b.src_color, b.dst_color, b.src_alpha, b.dst_alpha, b.equation);
	}
	
	Bind(){
		if(this.enabled == true){
			gl.enable(gl.BLEND);
			gl.blendFuncSeparate(this.src_color, this.dst_color, this.src_alpha, this.dst_alpha);
			if(this.equation != undefined)
				gl.blendEquation(this.equation);
		}else{
			gl.disable(gl.BLEND);
		}
	}
	
	static Bind(blendMode, blendEquation){
		if(blendMode == null){
			gl.disable(gl.BLEND);
		}else{
			blendMode.Bind();
		}
		if(blendEquation != undefined)
			blendEquation.Bind();
	}
	
	static Enable(){
		gl.enable(gl.BLEND);
	}
	static Disable(){
		gl.disable(gl.BLEND);
	}
}

export class CBlendEquation extends CGLExtObject{
	
	constructor(eq){
		super();
		this.equation = eq;
	}
	
	Bind(){
		gl.blendEquation(this.equation);
	}
	static Bind(eq){
		if(eq == null){
			gl.blendEquation(gl.FUNC_ADD);
		}else{
			eq.Bind();
		}
	}
}

CBlendMode.zero = 0;
CBlendMode.one = 1;
CBlendMode.src_color = 2;
CBlendMode.one_minus_src_color = 3;
CBlendMode.dst_color = 4;
CBlendMode.one_minus_dst_color = 5;
CBlendMode.src_alpha = 6;
CBlendMode.one_minus_src_alpha = 7;
CBlendMode.dst_alpha = 8;
CBlendMode.one_minus_dst_alpha = 9;
CBlendMode.constant_color = 10;
CBlendMode.one_minus_constant_color = 11;
CBlendMode.constant_alpha = 12;
CBlendMode.one_minus_constant_alpha = 13;
CBlendMode.src_alpha_saturate = 14;

CBlendEquation.add = 15;
CBlendEquation.subtract = 16;
CBlendEquation.reverse_subtract = 17;
CBlendEquation.min = 18;
CBlendEquation.max = 19;

setOpenGLInitCallbacks(CBlendMode.Init);

/* 
var ActiveBlendMode = null;
export var BlendMode_AlphaBlend    = null;
export var BlendMode_Additive 	   = null;
export var BlendMode_SrcOverride   = null;
export var BlendMode_Default       = null;

export class CBlendMode{
	
	static Zero(){ 					return gl.ZERO; }
	static One(){					return gl.ONE; }
	static SrcColor(){				return gl.SRC_COLOR; }
	static OneMinusSrcColor(){		return gl.ONE_MINUS_SRC_COLOR; }
	static DstColor(){				return gl.DST_COLOR; }
	static OneMinusDstColor(){		return gl.ONE_MINUS_DST_COLOR; }
	static SrcAlpha(){				return gl.SRC_ALPHA; }
	static OneMinusSrcAlpha(){		return gl.ONE_MINUS_SRC_ALPHA; }
	static DstAlpha(){				return gl.DST_ALPHA; }
	static OneMinusDstAlpha(){		return gl.ONE_MINUS_DST_ALPHA; }
	static ConstantColor(){			return gl.CONSTANT_COLOR; }
	static OneMinusConstantColor(){ return gl.ONE_MINUS_CONSTANT_COLOR; }
	static ConstantAlpha(){			return gl.CONSTANT_ALPHA; }
	static OneMinusConstantAlpha(){ return gl.ONE_MINUS_CONSTANT_ALPHA; }
	
	static EqAdd(){				return gl.FUNC_ADD; }
	static EqSubtract(){  		return gl.FUNC_SUBTRACT; }
	static EqReverseSubtract(){	return gl.FUNC_REVERSE_SUBTRACT; }
	static EqMin(){				return gl.MIN; }
	static EqMax(){				return gl.MAX; }
	
	constructor(s,d,e)
	{
		if(s===undefined) this.src = CBlendMode.One();
		else this.src = s;
		if(d===undefined) this.dst = CBlendMode.Zero();
		else this.dst = d;
		if(e===undefined) this.eq = CBlendMode.EqAdd();
		else this.eq = e;
	}
	
	setBlendSrcDst(source, destination){
		this.src = source; this.dst = destination;
	}
	
	setBlendEquation(eq){
		this.eq = eq;
	}
	
	setBlendMode( b ){ this.setBlendSrcDst(b.getSrcBlend(), b.getDstBlend()); this.setBlendEquation( b.getEquation() ); }
	
	getSrcBlend(){ return this.src; }
	getDstBlend(){ return this.dst; }
	getEquation(){ return this.eq;  }
	
	isEqual(b){ return (this.getSrcBlend() == b.getSrcBlend() && this.getDstBlend() == b.getDstBlend() && this.getEquation() == b.getEquation()); }
	
	Bind(){
		if(ActiveBlendMode instanceof CBlendMode)
			if(this.isEqual(ActiveBlendMode) == true) return;
		gl.blendFunc(this.src, this.dst);
		gl.blendEquation(this.eq);
		ActiveBlendMode = this;
	}
	
	static getDefault(){ return BlendMode_Default; }
	static setDefault(b){ BlendMode_Default.setBlendSrcDst(b.getSrcBlend(), b.getDstBlend()); BlendMode_Default.setBlendEquation(b.getEquation()); }
	
	static Init(){
		BlendMode_AlphaBlend  = new CBlendMode( CBlendMode.SrcAlpha(), CBlendMode.OneMinusSrcAlpha(), CBlendMode.EqAdd() );
		BlendMode_Additive 	  = new CBlendMode( CBlendMode.One(), CBlendMode.One(), CBlendMode.EqAdd() );
		BlendMode_SrcOverride = new CBlendMode( CBlendMode.One(), CBlendMode.Zero(), CBlendMode.EqAdd() );
		BlendMode_Default     = new CBlendMode( CBlendMode.One(), CBlendMode.Zero(), CBlendMode.EqAdd() );
		
		CBlendMode.Enable();
		BlendMode_Default.Bind();
		ActiveBlendMode = BlendMode_Default;
	}
	
	static Enable(){
		gl.enable(gl.BLEND);
	}
	static Disable(){
		gl.disable(gl.BLEND);
	}
}

class CBlendModeColorAttachment extends CBlendMode
{
	constructor(i,s,d,e){
		super(s,d,e);
		if(i===undefined) this.id = 0;
		else this.id = i;
	}
		
	setColorAttachmentNumber(i){ this.id = i; }
	getColorAttachmentNumber(){ return this.id; }
	
	Bind(i){ if(i!==undefined) this.id = i; gl.blendFunci(this.id, this.src, this.dst); gl.blendEquationi(this.id, this.eq); ActiveBlendMode = this; }
}

export class CBlendModeColorAttachments
{
	constructor(){
		this.blendModes = [];
	}
	
	addBlendMode(slot, blendMode){
		this.blendModes[slot] = new CBlendModeColorAttachment(slot, blendMode.getSrcBlend(), blendMode.getDstBlend(), blendMode.getEquation());
	}
	clearBlendMode(slot){
		this.blendModes[slot] = null;
	}
	Bind(){
		if(ActiveBlendMode === this) return;
		
		for(var i = 0; i < this.blendModes.length; ++i)
			if(this.blendModes[i] != null) this.blendModes[i].Bind();
		ActiveBlendMode = this;
	}
}*/