import { AssetState } from "../AssetEnums";
import { AssetType } from "../AssetEnums";

export interface IAsset {
    readonly id: string;          // 全局唯一（URL / hash / GUID）
    readonly type: AssetType;

    state: AssetState;
    error?: Error;

     /**
     * 返回 CPU 侧数据（RenderSystem 使用）
     * - Ready 前可返回 null
     */
    getCPUData(): unknown;

    /** 是否允许释放 CPU 数据 */
    canDiscardCPUData(): boolean;

    /** 执行释放（不保证立刻） */
    discardCPUData(): void;
}

export interface ILoadableAsset extends IAsset {
    load(): Promise<void>;
}