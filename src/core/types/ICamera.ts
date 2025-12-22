import { Scene } from "@/core/Scene"
import { mat4 } from "gl-matrix"
import { RenderTarget } from "./RenderTarget"

export interface ICamera {
    readonly scene: Scene
    readonly target: RenderTarget
    enabled: boolean
    order: number

    getViewMatrix(): mat4
    getProjectionMatrix(): mat4
}