import { ShaderHandle } from "@/assets/AssetHandle";

export class ShaderModuleManager {
    private modules = new Map<number, GPUShaderModule>();

    constructor(private device: GPUDevice) { }

    createShaderModule(handle: ShaderHandle, code: string): void {
        const module = this.device.createShaderModule({ code });
        this.modules.set(handle.id, module);
    }

    get(handle: ShaderHandle): GPUShaderModule | undefined {
        return this.modules.get(handle.id);
    }
}