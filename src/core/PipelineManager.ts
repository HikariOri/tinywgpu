/**
 * PipelineManager 管理渲染管线的创建和缓存
 * 支持根据不同的配置创建和重用管线
 */
export class PipelineManager {
    private device: GPUDevice;
    private pipelines: Map<string, GPURenderPipeline> = new Map();

    constructor(device: GPUDevice) {
        this.device = device;
    }

    /**
     * 获取或创建渲染管线
     * @param key 管线唯一标识（用于缓存）
     * @param descriptor 管线描述符创建函数（不需要传入 device，内部已持有）
     */
    getOrCreate(
        key: string,
        descriptor: () => GPURenderPipelineDescriptor
    ): GPURenderPipeline {
        let pipeline = this.pipelines.get(key);
        if (!pipeline) {
            const desc = descriptor();
            pipeline = this.device.createRenderPipeline(desc);
            this.pipelines.set(key, pipeline);
        }
        return pipeline;
    }

    /**
     * 获取管线（如果不存在则返回 null）
     */
    get(key: string): GPURenderPipeline | null {
        return this.pipelines.get(key) || null;
    }

    /**
     * 清除所有管线缓存
     */
    clear(): void {
        this.pipelines.clear();
    }

    /**
     * 移除指定管线
     */
    remove(key: string): boolean {
        return this.pipelines.delete(key);
    }
}

