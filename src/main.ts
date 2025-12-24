import * as core from "./core/index";
import { ExampleScene } from "./core/scenes/ExampleScene";
import { OrbitCameraController } from "./core/CameraController";

async function main() {
    // 创建引擎
    const engine = await core.Engine.Create();
    
    // 获取或创建 Canvas
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!canvas) {
        throw new Error("Canvas element not found");
    }
    
    // 注册 Canvas
    const device = engine.getDevice()!;
    const canvasContext = engine.canvasManager.registerCanvas(canvas, device, 'main');
    
    // 创建示例 Scene
    const scene = new ExampleScene(device, { type: 'canvas', canvasId: 'main' });
    engine.sceneManager.addScene(scene);
    
    // 创建相机控制器
    if (scene.camera) {
        const cameraController = new OrbitCameraController(scene.camera, canvas);
        // 设置初始目标点（立方体的位置）
        cameraController.setTarget(0, 0, -3);
    }
    
    // 启动渲染循环
    function renderLoop() {
        engine.RenderLoop();
        requestAnimationFrame(renderLoop);
    }
    
    renderLoop();
}

main().catch(console.error);
