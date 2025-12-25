import { Scene } from "../Scene"
import { ICamera } from "./ICamera"

export interface IRenderPass {
    // 每个 Pass 接受 Encoder 和 Camera / Scene
    execute(encoder: GPUCommandEncoder, scene: Scene, camera: ICamera): void

    // 可选：Pass 内部需要的资源
    // 比如 Pipeline / UniformBuffer
    initialize(device: GPUDevice): void
}
