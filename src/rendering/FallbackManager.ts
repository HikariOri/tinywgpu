// Rendering/FallbackManager.ts
import { ShaderHandle } from "../assets/AssetHandle";
import { AssetType } from "../assets/AssetEnums";
// import { GPUDevice } from "./types";
import { ShaderModuleManager } from "./ShaderModuleManager";

// 基本的回退着色器代码
const FALLBACK_VERTEX_SHADER = `
@vertex
fn main(
    @location(0) position: vec3f
) -> @builtin(position) vec4f {
    return vec4f(position, 1.0);
}
`;

const FALLBACK_FRAGMENT_SHADER = `
@fragment
fn main() -> @location(0) vec4f {
    return vec4f(1.0, 0.5, 0.5, 1.0); // 粉红色
}
`;

export class FallbackManager {
    private readonly device: GPUDevice;
    private readonly shaderModules: ShaderModuleManager;
    private fallbackShaderHandles: Map<string, ShaderHandle> = new Map();
    private fallbackShaderCount = 0;

    constructor(device: GPUDevice, shaderModules: ShaderModuleManager) {
        this.device = device;
        this.shaderModules = shaderModules;
    }

    /**
     * 获取指定类型资源的回退版本
     * @param assetType 资源类型
     * @param originalHandle 原始资源的句柄（用于创建回退资源的标识）
     * @returns 回退资源的句柄
     */
    getFallbackResource(assetType: AssetType, originalHandle: any): any {
        switch (assetType) {
            case AssetType.Shader:
                return this.getFallbackShader(originalHandle);
            case AssetType.Texture:
                return this.getFallbackTexture(originalHandle);
            case AssetType.Mesh:
                return this.getFallbackMesh(originalHandle);
            case AssetType.Material:
                return this.getFallbackMaterial(originalHandle);
            default:
                throw new Error(`No fallback available for asset type: ${assetType}`);
        }
    }

    /**
     * 获取着色器资源的回退版本
     */
    private getFallbackShader(originalHandle: ShaderHandle): ShaderHandle {
        const key = `fallback-shader-${originalHandle.id}`;
        if (this.fallbackShaderHandles.has(key)) {
            return this.fallbackShaderHandles.get(key)!;
        }

        // 创建新的回退着色器句柄
        const fallbackHandle: ShaderHandle = { id: ++this.fallbackShaderCount };

        // 根据原始着色器的用途选择合适的回退着色器
        const isVertexShader = originalHandle.id % 2 === 0; // 简单判断
        const fallbackCode = isVertexShader ? FALLBACK_VERTEX_SHADER : FALLBACK_FRAGMENT_SHADER;

        // 创建GPU着色器模块
        this.shaderModules.createShaderModule(fallbackHandle, fallbackCode);

        // 存储回退句柄
        this.fallbackShaderHandles.set(key, fallbackHandle);

        return fallbackHandle;
    }

    /**
     * 获取纹理资源的回退版本
     */
    private getFallbackTexture(originalHandle: any): any {
        // TODO: 实现回退纹理
        return null;
    }

    /**
     * 获取网格资源的回退版本
     */
    private getFallbackMesh(originalHandle: any): any {
        // TODO: 实现回退网格
        return null;
    }

    /**
     * 获取材质资源的回退版本
     */
    private getFallbackMaterial(originalHandle: any): any {
        // TODO: 实现回退材质
        return null;
    }

    /**
     * 检查资源是否需要使用回退
     * @param asset 要检查的资源
     * @returns 如果资源需要回退则返回true
     */
    public needsFallback(asset: any): boolean {
        return asset && (asset.state === "failed" || asset.state === "unloaded" || !asset);
    }
}
