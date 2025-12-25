/**
 * ShaderManager 管理 WebGPU 着色器的加载和缓存
 * 提供统一的着色器访问接口
 */
export class ShaderManager {
    private device: GPUDevice;
    private shaderCache: Map<string, GPUShaderModule> = new Map();
    private shaderCodeCache: Map<string, string> = new Map();

    constructor(device: GPUDevice) {
        this.device = device;
    }

    /**
     * 加载顶点着色器
     * @param path 着色器文件路径
     * @param shaderCode 着色器代码（可选，用于直接传递代码）
     * @returns 加载的顶点着色器模块
     */
    async loadVertexShader(path: string, shaderCode?: string): Promise<GPUShaderModule> {
        return this.loadShader(path, 'vertex', shaderCode);
    }

    /**
     * 加载片段着色器
     * @param path 着色器文件路径
     * @param shaderCode 着色器代码（可选，用于直接传递代码）
     * @returns 加载的片段着色器模块
     */
    async loadFragmentShader(path: string, shaderCode?: string): Promise<GPUShaderModule> {
        return this.loadShader(path, 'fragment', shaderCode);
    }

    /**
     * 加载着色器
     * @param path 着色器文件路径
     * @param type 着色器类型 ('vertex' 或 'fragment')
     * @param shaderCode 着色器代码（可选，用于直接传递代码）
     * @returns 加载的着色器模块
     */
    private async loadShader(path: string, type: string, shaderCode?: string): Promise<GPUShaderModule> {
        const cacheKey = `${type}_${path}`;
        
        // 检查缓存
        if (this.shaderCache.has(cacheKey)) {
            return this.shaderCache.get(cacheKey)!;
        }

        let code: string;
        if (shaderCode) {
            // 如果直接提供了代码，使用它
            code = shaderCode;
        } else {
            // 否则从文件加载
            try {
                // 使用 Vite 的动态导入获取原始字符串
                const importedModule = await import(`${path}?raw`);
                code = importedModule.default;
            } catch (error) {
                throw new Error(`Failed to load shader ${path}: ${error}`);
            }
        }

        // 缓存着色器代码
        this.shaderCodeCache.set(cacheKey, code);

        // 创建着色器模块
        const shaderModule = this.device.createShaderModule({
            code,
            label: `${type} shader: ${path}`
        });

        // 缓存着色器模块
        this.shaderCache.set(cacheKey, shaderModule);

        return shaderModule;
    }

    /**
     * 获取已缓存的着色器模块
     * @param path 着色器文件路径
     * @param type 着色器类型 ('vertex' 或 'fragment')
     * @returns 着色器模块，如果不存在则返回 null
     */
    getShaderModule(path: string, type: string): GPUShaderModule | null {
        const cacheKey = `${type}_${path}`;
        return this.shaderCache.get(cacheKey) || null;
    }

    /**
     * 获取已缓存的着色器代码
     * @param path 着色器文件路径
     * @param type 着色器类型 ('vertex' 或 'fragment')
     * @returns 着色器代码，如果不存在则返回 null
     */
    getShaderCode(path: string, type: string): string | null {
        const cacheKey = `${type}_${path}`;
        return this.shaderCodeCache.get(cacheKey) || null;
    }

    /**
     * 清除指定着色器缓存
     * @param path 着色器文件路径
     * @param type 着色器类型 ('vertex' 或 'fragment')
     * @returns 是否成功清除
     */
    clearShader(path: string, type: string): boolean {
        const cacheKey = `${type}_${path}`;
        const codeRemoved = this.shaderCodeCache.delete(cacheKey);
        const moduleRemoved = this.shaderCache.delete(cacheKey);
        return codeRemoved && moduleRemoved;
    }

    /**
     * 清除所有着色器缓存
     */
    clearAll(): void {
        this.shaderCache.clear();
        this.shaderCodeCache.clear();
    }
}