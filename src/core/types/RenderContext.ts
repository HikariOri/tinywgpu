import { ICamera } from "./ICamera";
import { Scene } from "../Scene";

/**
 * 渲染上下文，包含渲染所需的所有信息
 */
export interface RenderContext {
    /** 当前渲染的 Camera */
    camera: ICamera;
    /** 当前渲染的 Scene */
    scene: Scene;
    /** GPU 设备 */
    device: GPUDevice;
    /** 渲染目标纹理视图 */
    textureView: GPUTextureView;
    /** 渲染目标宽度 */
    width: number;
    /** 渲染目标高度 */
    height: number;
    /** 渲染目标格式 */
    format: GPUTextureFormat;
}

