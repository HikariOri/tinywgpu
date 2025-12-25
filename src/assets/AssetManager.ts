// Assets/AssetManager.ts
import { IAsset } from "./asset_types/IAsset";
import { AssetState } from "./AssetEnums";

export class AssetManager {
    private assets = new Map<string, IAsset>();

    register<T extends IAsset>(asset: T): T {
        const existing = this.assets.get(asset.id);
        if (existing) {
            return existing as T;
        }
        this.assets.set(asset.id, asset);
        return asset;
    }

    get<T extends IAsset>(id: string): T | undefined {
        return this.assets.get(id) as T | undefined;
    }

    /**
     * 确保 Asset 进入 Ready 或 Failed
     * - 不修改 state
     * - 不假设 asset 一定可 load
     */
    async ensureReady(asset: IAsset): Promise<void> {
        if (
            asset.state === AssetState.Ready ||
            asset.state === AssetState.Failed
        ) {
            return;
        }

        if (asset.state === AssetState.Loading) {
            // 等待 asset 自己完成（轮询或事件，暂用简单方式）
            return this.waitForCompletion(asset);
        }

        // 只有具备 load 能力的 asset 才能被触发
        const loadable = asset as Partial<{ load(): Promise<void> }>;
        if (!loadable.load) {
            return;
        }

        try {
            await loadable.load();
        } catch {
            // error 已由 asset 自己记录
        }
    }

    /**
     * 批量 prepare（Scene warm-up）
     */
    async prepare(assets: Iterable<IAsset>): Promise<void> {
        await Promise.all(
            Array.from(assets).map(asset => this.ensureReady(asset))
        );
    }

    /**
     * 等待 Loading → Ready / Failed
     *（简单实现，后续可事件化）
     */
    private async waitForCompletion(asset: IAsset): Promise<void> {
        while (asset.state === AssetState.Loading) {
            await Promise.resolve();
        }
    }
}
