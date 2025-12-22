import { CanvasContext } from "./CanvasContext";

export class CanvasManager {
    private contexts: Map<string, CanvasContext> = new Map();
    private defaultCanvasId: string | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private windowResizeHandler: (() => void) | null = null;

    // 不再依赖Engine，只需要device
    constructor() {
        this.setupResizeListener();
    }

    // 注册canvas时需要device
    registerCanvas(
        canvas: HTMLCanvasElement,
        device: GPUDevice,
        id?: string
    ): CanvasContext {
        if (!id) {
            id = `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        const context = new CanvasContext(canvas, device);
        this.contexts.set(id, context);

        if (!this.defaultCanvasId) {
            this.defaultCanvasId = id;
        }

        // 初始化canvas尺寸
        context.updateSize();

        // 使用ResizeObserver监听canvas元素大小变化
        if (this.resizeObserver) {
            this.resizeObserver.observe(canvas);
        }

        return context;
    }

    // 其他方法保持独立...
    getContext(canvasId: string): CanvasContext | null {
        return this.contexts.get(canvasId) || null;
    }

    // 处理resize等
    updateAllCanvasSizes(): void {
        for (const [id, context] of this.contexts) {
            context.updateSize();
        }
    }

    // 设置窗口大小监听
    private setupResizeListener(): void {
        // 使用ResizeObserver监听canvas元素大小变化（更精确）
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateAllCanvasSizes();
            });
        }

        // 同时监听window resize事件（作为后备方案）
        this.windowResizeHandler = () => {
            this.updateAllCanvasSizes();
        };
        window.addEventListener('resize', this.windowResizeHandler);
    }

    // 清理资源
    destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.windowResizeHandler) {
            window.removeEventListener('resize', this.windowResizeHandler);
            this.windowResizeHandler = null;
        }
        this.contexts.clear();
    }
}