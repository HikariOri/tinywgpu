/**
 * PipelineManager 管理渲染管线的创建和缓存
 * 支持根据不同的配置创建和重用管线
 */
export class PipelineManager {
    private device: GPUDevice;
    private pipelines: Map<string, GPURenderPipeline> = new Map();
    // 跟踪正在异步创建的管线
    private pendingPipelines: Map<string, Promise<GPURenderPipeline>> = new Map();

    constructor(device: GPUDevice) {
        this.device = device;
    }

    /**
     * 获取或创建渲染管线（同步版本）
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
     * 获取或创建渲染管线（异步版本）
     * @param key 管线唯一标识（用于缓存）
     * @param descriptor 异步的管线描述符创建函数
     */
    async getOrCreateAsync(
        key: string,
        descriptor: () => Promise<GPURenderPipelineDescriptor>
    ): Promise<GPURenderPipeline> {
        // 检查是否已存在
        if (this.pipelines.has(key)) {
            return this.pipelines.get(key)!;
        }

        // 检查是否正在创建中
        if (this.pendingPipelines.has(key)) {
            return this.pendingPipelines.get(key)!;
        }

        // 创建新的异步任务
        const pipelinePromise = (async () => {
            const desc = await descriptor();
            const pipeline = this.device.createRenderPipeline(desc);
            this.pipelines.set(key, pipeline);
            this.pendingPipelines.delete(key);
            return pipeline;
        })();

        this.pendingPipelines.set(key, pipelinePromise);
        return pipelinePromise;
    }

    /**
     * 检查管线是否已创建或正在创建中
     * @param key 管线唯一标识
     */
    has(key: string): boolean {
        return this.pipelines.has(key) || this.pendingPipelines.has(key);
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
        this.pendingPipelines.clear();
    }

    /**
     * 移除指定管线
     */
    remove(key: string): boolean {
        this.pendingPipelines.delete(key);
        return this.pipelines.delete(key);
    }
}

