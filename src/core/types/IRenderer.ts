import { ICamera } from "./ICamera";
import { RenderContext } from "./RenderContext";

/**
 * Renderer 接口
 * 根据 README 设计，Renderer 不是调度单位，需要额外输入 Scene、Camera 和 RenderTarget
 */
export interface IRenderer {
    /** Renderer 类型标识 */
    readonly type: string;
    /** 渲染优先级（数字越小优先级越高） */
    readonly priority: number;
    
    /**
     * 判断是否可以渲染指定的 Camera
     * @param camera 要渲染的 Camera
     * @returns 是否可以渲染
     */
    canRender(camera: ICamera): boolean;
    
    /**
     * 执行渲染
     * @param commandEncoder GPU 命令编码器
     * @param context 渲染上下文（包含 Camera、Scene、设备等信息）
     */
    render(
        commandEncoder: GPUCommandEncoder,
        context: RenderContext
    ): void;
    
    /**
     * 清理资源
     */
    dispose(): void;
}