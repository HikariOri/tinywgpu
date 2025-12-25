import { IAsset } from "@/assets/asset_types/IAsset"
import { ICamera } from "../core/types/ICamera"
import { Scene } from "./Scene"

export class SceneManager {
    private scenes = new Set<Scene>()

    addScene(scene: Scene) {
        this.scenes.add(scene)
        scene.onAttach()
    }

    removeScene(scene: Scene) {
        scene.onDetach()
        this.scenes.delete(scene)
    }

    update(deltaTime: number) {
        for (const scene of this.scenes) {
            scene.update(deltaTime)
        }
    }

    getRenderCameras(): ICamera[] {
        return [...this.scenes]
            .flatMap(scene => scene.cameras)
            .filter(camera => camera.enabled)
            .sort((a, b) => a.order - b.order)
    }

    collectAssets(): Set<IAsset> {
        let assets = new Set<IAsset>()
        // TODO: 递归收集所有场景中的资产
        return assets
    }
}
