import { BufferManager } from "../core/BufferManager";
import { PipelineManager } from "../core/PipelineManager";
import { CanvasManager } from "../core/CanvasManager";
import { ForwardRenderer } from "./ForwardRenderer";
import { ICamera } from "../core/types/ICamera";
import { IRenderer } from "../core/types/IRenderer";
import { RenderContext } from "../core/types/RenderContext";
import { ResourceManager } from "../core/ResourceManager";
import { IShaderModuleFactory } from "@/rendering/IShaderModuleFactory";
import { ShaderModuleManager } from "./ShaderModuleManager";
import { ShaderHandle } from "@/assets/AssetHandle";
import { FallbackManager } from "./FallbackManager";

/**
 * RenderSystem 封装所有 GPU 相关的操作
 * - Device 的唯一拥有者
 * - 管理共享的资源管理器（所有 Renderer 共享）
 * - 支持注册多个 Renderer（都共享同一个 Device 和资源管理器）
 */
export class RenderSystem implements IShaderModuleFactory {
    /** RenderSystem 是 Device 的唯一拥有者，各个 IRenderer 实例只共享*/
    private readonly device: GPUDevice;
    private readonly adapter: GPUAdapter;

    // 共享的资源管理器（所有 Renderer 共享）
    public readonly bufferManager: BufferManager;
    public readonly pipelineManager: PipelineManager;
    public readonly canvasManager: CanvasManager;
    public readonly resourceManager: ResourceManager;
    public readonly shaderModules: ShaderModuleManager;
    public readonly fallbackManager: FallbackManager;

    // Renderer 集合（可以注册多个，都共享上面的资源）
    private renderers: IRenderer[] = [];

    constructor(adapter: GPUAdapter, device: GPUDevice) {
        this.adapter = adapter;
        this.device = device;

        // 创建共享的资源管理器
        this.bufferManager = new BufferManager(device);
        this.pipelineManager = new PipelineManager(device);
        this.canvasManager = new CanvasManager(device);
        this.resourceManager = new ResourceManager(device);
        this.shaderModules = new ShaderModuleManager(this.device);
        this.fallbackManager = new FallbackManager(this.device, this.shaderModules);
    }

    public initialize(): void {
        // 初始化所有 Renderer
        // for (const renderer of this.renderers) {
        //     renderer.initialize();
        // }
    }

    /**
     * 注册 Renderer（所有 Renderer 共享同一个 Device 和资源管理器）
     * @param renderer 要注册的 Renderer（实现 IRenderer 接口）
     */
    registerRenderer(renderer: IRenderer): void {
        this.renderers.push(renderer);
        // 按优先级排序（数字越小优先级越高）
        this.renderers.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 创建并注册一个默认的 Renderer（向后兼容）
     * @returns 创建的 Renderer
     */
    createDefaultRenderer(): IRenderer {
        const renderer = new ForwardRenderer(
            this.device,  // 共享的 Device
            this.bufferManager,  // 共享的资源管理器
            this.pipelineManager,
            this.canvasManager,
            this.resourceManager,
        );
        this.registerRenderer(renderer);
        return renderer;
    }

    /**
     * 渲染一帧
     * 按照 IRenderer 接口的方式，为每个相机创建 RenderContext 并调用相应的 Renderer
     * 每个 Camera 都有其绑定的 Renderer（一一对应关系）
     */
    renderFrame(cameras: ICamera[]): void {
        // 开始帧（使用共享的 Device）
        const commandEncoder = this.device.createCommandEncoder();

        // 遍历每个相机
        for (const camera of cameras) {
            // 为当前相机创建 RenderContext
            const context = this.createRenderContext(camera);
            if (!context) {
                continue; // 如果无法创建上下文，跳过这个相机
            }

            // 使用 Camera 绑定的 Renderer 进行渲染（一一对应关系）
            camera.renderer.render(commandEncoder, context);
        }

        // 提交命令
        this.device.queue.submit([commandEncoder.finish()]);
    }

    /**
     * 为指定相机创建 RenderContext
     */
    private createRenderContext(camera: ICamera): RenderContext | null {
        const target = camera.target;

        let textureView: GPUTextureView;
        let width: number;
        let height: number;
        let format: GPUTextureFormat;

        if (target.type === 'canvas') {
            const canvasContext = this.canvasManager.getContext(target.canvasId);
            if (!canvasContext) {
                console.warn(`Canvas context not found: ${target.canvasId}`);
                return null;
            }
            const texture = canvasContext.getCurrentTexture();
            textureView = texture.createView();
            width = texture.width;
            height = texture.height;
            format = navigator.gpu!.getPreferredCanvasFormat();
        } else {
            textureView = target.texture.createView();
            width = target.width;
            height = target.height;
            format = navigator.gpu!.getPreferredCanvasFormat();
        }

        return {
            camera,
            scene: camera.scene,
            device: this.device,
            textureView,
            width,
            height,
            format,
        };
    }

    /**
     * 获取 Device（仅在必要时使用，通常上层不应直接访问）
     * 建议通过 RenderSystem 的公共接口来操作
     */
    getDevice(): GPUDevice {
        return this.device;
    }

    //#region Interface Implementations
    createShaderModule(handle: ShaderHandle, code: string): void {
        this.shaderModules.createShaderModule(handle, code);
    }
    //#endregion
}

