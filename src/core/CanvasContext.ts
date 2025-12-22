export class CanvasContext {
    private device: GPUDevice;
    private context: GPUCanvasContext;
    private canvas: HTMLCanvasElement;

    // 独立资源
    private depthTexture: GPUTexture | null = null;
    private multisampleTexture: GPUTexture | null = null;
    private renderPipeline: GPURenderPipeline | null = null;
    private bindGroups: Map<string, GPUBindGroup> = new Map();
    private uniformBuffers: Map<string, GPUBuffer> = new Map();

    // Canvas特定状态
    private size: { width: number; height: number };
    private pixelRatio: number = 1;

    constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
        this.canvas = canvas;
        this.device = device;
        this.context = canvas.getContext('webgpu')!;
        this.size = { width: canvas.width, height: canvas.height };

        this.configure();
        // this.createDepthTexture();
    }

    private configure() {
        const format = navigator.gpu!.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            alphaMode: 'opaque'
        });
    }

    resize(width: number, height: number) {
        // 更新canvas尺寸和所有依赖的资源
        this.size = { width, height };
        this.canvas.width = width;
        this.canvas.height = height;
        // this.recreateDepthTexture();
    }

    getCurrentTexture(): GPUTexture {
        return this.context.getCurrentTexture();
    }

    // 其他资源管理方法...
    public updateSize() {
        // 获取CSS显示尺寸
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        
        // 考虑设备像素比，避免在高DPI屏幕上模糊
        const pixelRatio = window.devicePixelRatio || 1;
        const width = Math.floor(displayWidth * pixelRatio);
        const height = Math.floor(displayHeight * pixelRatio);
        
        // 如果尺寸没有变化，不需要重新配置
        if (this.size.width === width && this.size.height === height) {
            return;
        }
        
        // 更新尺寸
        this.resize(width, height);
    }
}