import { IAsset } from "./IAsset";
import { AssetState, AssetType } from "../AssetEnums";

export class ShaderAsset implements IAsset {
    readonly id: string;
    readonly type = AssetType.Shader;

    state: AssetState = AssetState.Unloaded;
    error?: Error;

    private readonly url: string;

    // CPU 侧数据（WGSL 源码）
    private sourceCode: string | null = null;

    constructor(url: string) {
        this.id = url;
        this.url = url;
    }

    async load(): Promise<void> {
        if (this.state !== AssetState.Unloaded) {
            return;
        }

        this.state = AssetState.Loading;

        try {
            const response = await fetch(this.url);
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${this.url}`);
            }

            this.sourceCode = await response.text();
            this.state = AssetState.Ready;
        } catch (err) {
            this.state = AssetState.Failed;
            this.error = err as Error;
            throw err;
        }
    }

    getCPUData(): string | null {
        return this.sourceCode;
    }

    canDiscardCPUData(): boolean {
        // Shader 通常可以丢弃源码（除非支持热重载）
        return true;
    }

    discardCPUData(): void {
        this.sourceCode = null;
    }
}
