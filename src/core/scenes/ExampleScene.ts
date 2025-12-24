import { Scene } from "../Scene";
import { PerspectiveCamera } from "../Camera";
import { Renderable } from "../Renderable";
import { MeshBuilder } from "../Mesh";
import { RenderTarget } from "../types/RenderTarget";
import { GPUDevice } from "@webgpu/types";

/**
 * 示例 Scene：包含一个正方体和一个 Camera
 */
export class ExampleScene extends Scene {
    public cube: Renderable | null = null;
    public camera: PerspectiveCamera | null = null;

    constructor(device: GPUDevice, target: RenderTarget) {
        super();
        
        // 创建正方体
        const cubeMesh = MeshBuilder.createCube(device, 1.0);
        this.cube = new Renderable(cubeMesh);
        this.cube.setPosition(0, 0, -3); // 放在相机前方
        this.cube.setRotation(0.5, 0.5, 0); // 稍微旋转以便看到3D效果
        this.addRenderable(this.cube);

        // 创建 Camera
        this.camera = new PerspectiveCamera(this, target);
        this.camera.setPosition(0, 0, 0); // 相机在原点
        this.camera.setProjection(45, 1.0, 0.1, 100); // 45度视野，宽高比稍后更新
        this.camera.order = 0;
        this.camera.enabled = true;
    }

    override update(deltaTime: number): void {
        // 预留：每帧更新场景
        // 例如可以让正方体旋转
        // 注意：如果使用相机控制器，可以注释掉自动旋转
        // if (this.cube) {
        //     this.cube.addRotation(deltaTime * 0.5, deltaTime * 0.3, 0);
        // }
    }
}

