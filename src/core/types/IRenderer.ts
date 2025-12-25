import { RenderContext } from "./RenderContext";

/**
 * Renderer 接口
 * 根据 README 设计，Renderer 与 Camera 一一对应
 * Renderer 负责执行具体的渲染逻辑
 */
export interface IRenderer {
    /** Renderer 类型标识 */
    readonly type: string;
    /** 渲染优先级（数字越小优先级越高） */
    readonly priority: number;

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