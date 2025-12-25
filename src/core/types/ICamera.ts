import { Scene } from "../../scene/Scene"
import { mat4 } from "gl-matrix"
import { RenderTarget } from "./RenderTarget"
import { IRenderer } from "./IRenderer"

export interface ICamera {
    readonly scene: Scene
    readonly target: RenderTarget
    readonly renderer: IRenderer  // Camera 与 Renderer 一一对应
    enabled: boolean
    order: number

    getViewMatrix(): mat4
    getProjectionMatrix(): mat4
}