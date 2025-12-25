import { ICamera } from "@/core/types/ICamera"
import { Renderable } from "./Renderable"

export abstract class Scene {
    protected _cameras: Set<ICamera> = new Set()
    protected _renderables: Set<Renderable> = new Set()

    /** 由 SceneManager / Engine 注入 */
    onAttach(): void { }

    /** 逻辑更新，不涉及 GPU */
    update(deltaTime: number): void { }

    /** Scene 销毁 */
    onDetach(): void {
        this._cameras.clear()
        this._renderables.clear()
    }

    /** Camera 对 Scene 只读暴露 */
    get cameras(): readonly ICamera[] {
        return [...this._cameras]
    }

    /** Renderable 对 Scene 只读暴露 */
    get renderables(): readonly Renderable[] {
        return [...this._renderables]
    }

    /** 受控地添加 Camera */
    protected addCamera(camera: ICamera): void {
        if (camera.scene !== this) {
            throw new Error("Camera.scene mismatch")
        }
        this._cameras.add(camera)
    }

    protected removeCamera(camera: ICamera): void {
        this._cameras.delete(camera)
    }

    /** 添加 Renderable */
    protected addRenderable(renderable: Renderable): void {
        this._renderables.add(renderable)
    }

    protected removeRenderable(renderable: Renderable): void {
        this._renderables.delete(renderable)
    }
}
