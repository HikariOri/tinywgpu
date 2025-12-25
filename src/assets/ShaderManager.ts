/**
 * ShaderManager 管理 WebGPU 着色器的加载和缓存
 * 提供统一的着色器访问接口
 * 
 * 支持两种加载方式：
 * 1. import.meta.glob（适用于预知的着色器，在构建时优化）
 * 2. fetch（完全动态加载）
 */

// 使用 import.meta.glob 预加载所有 shader 文件（构建时优化）
// @ts-ignore - import.meta.glob 是 Vite 的特殊功能，TypeScript 不识别
const shaderModules = import.meta.glob('/src/shaders/**/*.wgsl?raw', { 
    import: 'default',
    eager: false 
}) as Record<string, () => Promise<string>>;

export class ShaderManager {
    private device: GPUDevice;
    private shaderCache: Map<string, GPUShaderModule> = new Map();
    private shaderCodeCache: Map<string, string> = new Map();
    
    // 默认 shader 文件夹路径
    private readonly defaultShaderDir = '/src/shaders/';

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
     * 加载着色器代码（内部方法）
     * 支持默认文件夹搜索和完整路径动态加载
     * @param path 着色器文件路径（可以是相对路径或完整路径）
     * @returns 着色器代码字符串
     */
    private async loadShaderCode(path: string): Promise<string> {
        // 检查代码缓存
        if (this.shaderCodeCache.has(path)) {
            return this.shaderCodeCache.get(path)!;
        }

        // 规范化路径：处理相对路径和完整路径
        let normalizedPath = path;
        
        // 如果路径不是以 / 开头，且不包含 ../，则认为是相对路径，在默认文件夹下搜索
        if (!path.startsWith('/') && !path.startsWith('../') && !path.startsWith('./')) {
            // 相对路径：在默认文件夹下搜索
            normalizedPath = `${this.defaultShaderDir}${path}`;
            // 确保路径以 .wgsl 结尾
            if (!normalizedPath.endsWith('.wgsl')) {
                normalizedPath += '.wgsl';
            }
        } else if (path.startsWith('../') || path.startsWith('./')) {
            // 相对路径（相对于当前文件）：转换为绝对路径
            // 例如：../shaders/basic.vert.wgsl -> /src/shaders/basic.vert.wgsl
            normalizedPath = path.replace(/^\.\.\//, '/src/').replace(/^\.\//, '/src/');
        }
        
        // 确保路径以 /src/ 开头
        if (!normalizedPath.startsWith('/src/')) {
            normalizedPath = `/src/${normalizedPath}`;
        }

        let code: string;

        try {
            // 尝试方法1: import.meta.glob（适用于预知的着色器，构建时优化）
            // glob 的键是完整路径，需要尝试匹配（带或不带 ?raw）
            const globKey = normalizedPath;
            const globKeyWithRaw = `${normalizedPath}?raw`;
            
            // 尝试匹配 glob 键（可能带 ?raw 也可能不带）
            const matchedKey = shaderModules[globKey] ? globKey : 
                              shaderModules[globKeyWithRaw] ? globKeyWithRaw : 
                              Object.keys(shaderModules).find(key => 
                                  key.replace('?raw', '') === normalizedPath
                              );
            
            if (matchedKey && shaderModules[matchedKey]) {
                code = await shaderModules[matchedKey]();
                this.shaderCodeCache.set(path, code);
                return code;
            }

            // 尝试方法2: fetch（完全动态加载）
            const response = await fetch(normalizedPath);
            if (response.ok) {
                code = await response.text();
                this.shaderCodeCache.set(path, code);
                return code;
            }

            throw new Error(`Shader not found: ${path} (tried: ${normalizedPath})`);
        } catch (error) {
            console.error(`Failed to load shader ${path}:`, error);
            throw error;
        }
    }

    /**
     * 加载着色器
     * @param path 着色器文件路径（可以是相对路径或完整路径）
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
            code = await this.loadShaderCode(path);
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