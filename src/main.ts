import * as core from "./core/index";
import { ExampleScene } from "./core/scenes/ExampleScene";
import { OrbitCameraController } from "./core/CameraController";

async function main() {
    // 创建引擎
    const engine = await core.Engine.create();

    // 获取渲染系统（用于访问 GPU 资源）
    const renderSystem = engine.getRenderSystem();

    // 获取或创建 Canvas
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error("Canvas element not found");
    }

    // 注册 Canvas
    renderSystem.canvasManager.registerCanvas(canvas, 'main');

    // 创建示例 Scene
    const scene = new ExampleScene(renderSystem, { type: 'canvas', canvasId: 'main' });
    engine.sceneManager.addScene(scene);

    // 创建相机控制器
    if (scene.camera) {
        const cameraController = new OrbitCameraController(scene.camera, canvas);
        // 设置初始目标点（立方体的位置）
        cameraController.setTarget(0, 0, -3);
    }

    // 等待引擎准备完成（包括设备初始化和资源加载）
    await engine.prepare();
    // 启动渲染循环（内部使用 requestAnimationFrame 管理）
    engine.start();
}

main().catch(console.error);
