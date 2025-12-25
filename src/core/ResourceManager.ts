import { ShaderManager } from "../assets/ShaderManager";

/**
 * 完成对共享资源的管理
 */
export class ResourceManager {
    private _shaderManager: ShaderManager | null = null;

    constructor(device: GPUDevice) {
        this._shaderManager = new ShaderManager(device);
    }

    getShaderManager(): ShaderManager | null {
        return this._shaderManager;
    }

    clear(): void {
        this._shaderManager = null;
    }
}