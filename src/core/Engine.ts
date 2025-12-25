import { SceneManager } from "../scene/SceneManager";
import { AssetManager } from "../assets/AssetManager";
import { RenderSystem } from "../rendering/RenderSystem";

/**
 * Engine 是生命周期协调器
 * - 协调 Scene / Asset / Rendering
 * - 管理主循环
 * - 不关心具体资源类型
 */
export class Engine {
    // 核心系统
    public readonly sceneManager: SceneManager;
    public readonly assetManager: AssetManager;
    private readonly renderSystem: RenderSystem;

    // 循环状态
    private _lastFrameTime = 0;
    private _animationFrameId: number | null = null;
    private _isRunning = false;

    private constructor(renderSystem: RenderSystem) {
        this.renderSystem = renderSystem;
        this.sceneManager = new SceneManager();
        this.assetManager = new AssetManager();
    }

    /**
     * 创建 Engine（初始化 WebGPU）
     */
    public static async create(): Promise<Engine> {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Failed to get GPU adapter.");
        }

        const device = await adapter.requestDevice();
        const renderSystem = new RenderSystem(adapter, device);
        renderSystem.initialize();

        return new Engine(renderSystem);
    }

    /**
     * Prepare 阶段
     * - 允许 await
     * - 推进 Scene 中所需 Asset 到 Ready
     */
    public async prepare(): Promise<void> {
        const assets = this.sceneManager.collectAssets();
        await this.assetManager.prepare(assets);
    }

    /**
     * 启动主循环
     * - 不允许 await
     */
    public start(): void {
        if (this._isRunning) {
            console.warn("Engine already running.");
            return;
        }

        this._isRunning = true;
        this._lastFrameTime = performance.now();
        this._tick();
    }

    /**
     * 停止主循环
     */
    public stop(): void {
        if (this._animationFrameId !== null) {
            cancelAnimationFrame(this._animationFrameId);
            this._animationFrameId = null;
        }
        this._isRunning = false;
    }

    /**
     * 主循环
     */
    private _tick = (): void => {
        if (!this._isRunning) {
            return;
        }

        this._frame();
        this._animationFrameId = requestAnimationFrame(this._tick);
    };

    /**
     * 单帧执行
     */
    private _frame(): void {
        const now = performance.now();
        const deltaTime = this._lastFrameTime === 0 ? 0 : (now - this._lastFrameTime) / 1000;
        this._lastFrameTime = now;

        // 逻辑更新
        this.sceneManager.update(deltaTime);

        // 5. 渲染（使用Fallback处理未加载成功的资源）
        const cameras = this.sceneManager.getRenderCameras();
        this.renderSystem.renderFrame(cameras);
    }

    public getRenderSystem(): RenderSystem {
        return this.renderSystem;
    }
}
