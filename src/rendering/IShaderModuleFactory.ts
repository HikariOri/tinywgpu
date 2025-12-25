import { ShaderHandle } from "../assets/AssetHandle";

export interface IShaderModuleFactory {
    createShaderModule(
        handle: ShaderHandle,
        code: string
    ): void;
}