import { PerspectiveCamera } from "./Camera";
import { vec3 } from "gl-matrix";

/**
 * 轨道相机控制器
 * 支持鼠标拖拽旋转、滚轮缩放、右键平移等操作
 */
export class OrbitCameraController {
    private camera: PerspectiveCamera;
    private canvas: HTMLCanvasElement;
    
    // 轨道参数（球坐标系）
    private target: vec3 = vec3.fromValues(0, 0, -3); // 目标点（相机围绕的点）
    private distance: number = 5; // 相机到目标点的距离
    private azimuth: number = 0; // 方位角（水平旋转，弧度）
    private elevation: number = Math.PI / 6; // 仰角（垂直旋转，弧度，0为水平，PI/2为垂直向上）
    
    // 鼠标控制
    private isDragging: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private dragButton: number = 0; // 0=左键旋转, 1=中键平移, 2=右键平移
    
    // 控制参数
    private rotateSpeed: number = 0.005; // 旋转灵敏度
    private panSpeed: number = 0.01; // 平移灵敏度
    private zoomSpeed: number = 0.1; // 缩放灵敏度
    private minDistance: number = 0.5; // 最小距离
    private maxDistance: number = 50; // 最大距离
    private minElevation: number = -Math.PI / 2 + 0.1; // 最小仰角（避免翻转）
    private maxElevation: number = Math.PI / 2 - 0.1; // 最大仰角
    
    // 事件处理函数（需要保存以便移除）
    private mouseDownHandler: (e: MouseEvent) => void;
    private mouseMoveHandler: (e: MouseEvent) => void;
    private mouseUpHandler: (e: MouseEvent) => void;
    private wheelHandler: (e: WheelEvent) => void;
    private contextMenuHandler: (e: MouseEvent) => void;

    constructor(camera: PerspectiveCamera, canvas: HTMLCanvasElement) {
        this.camera = camera;
        this.canvas = canvas;
        
        // 绑定事件处理函数
        this.mouseDownHandler = this.onMouseDown.bind(this);
        this.mouseMoveHandler = this.onMouseMove.bind(this);
        this.mouseUpHandler = this.onMouseUp.bind(this);
        this.wheelHandler = this.onWheel.bind(this);
        this.contextMenuHandler = this.onContextMenu.bind(this);
        
        // 添加事件监听
        this.canvas.addEventListener('mousedown', this.mouseDownHandler);
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.addEventListener('mouseup', this.mouseUpHandler);
        this.canvas.addEventListener('mouseleave', this.mouseUpHandler); // 鼠标离开canvas时也停止拖拽
        this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });
        this.canvas.addEventListener('contextmenu', this.contextMenuHandler);
        
        // 初始化相机位置
        this.updateCameraPosition();
    }

    /**
     * 设置目标点（相机围绕的点）
     */
    setTarget(x: number, y: number, z: number) {
        vec3.set(this.target, x, y, z);
        this.updateCameraPosition();
    }



    /**
     * 设置相机距离
     */
    setDistance(distance: number) {
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, distance));
        this.updateCameraPosition();
    }

    /**
     * 设置旋转角度
     */
    setRotation(azimuth: number, elevation: number) {
        this.azimuth = azimuth;
        this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, elevation));
        this.updateCameraPosition();
    }

    /**
     * 根据球坐标更新相机位置
     */
    private updateCameraPosition() {
        // 计算相机在世界坐标系中的位置
        const x = this.target[0] + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
        const y = this.target[1] + this.distance * Math.sin(this.elevation);
        const z = this.target[2] + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);
        
        // 使用 lookAt 方法让相机看向目标点
        this.camera.lookAt(
            [x, y, z],
            [this.target[0], this.target[1], this.target[2]],
            [0, 1, 0]
        );
    }

    /**
     * 鼠标按下事件
     */
    private onMouseDown(e: MouseEvent) {
        this.isDragging = true;
        this.dragButton = e.button;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.canvas.style.cursor = 'grabbing';
    }

    /**
     * 鼠标移动事件
     */
    private onMouseMove(e: MouseEvent) {
        if (!this.isDragging) return;
        
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        
        if (this.dragButton === 0) {
            // 左键：旋转
            this.azimuth -= deltaX * this.rotateSpeed;
            this.elevation += deltaY * this.rotateSpeed;
            this.elevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevation));
            this.updateCameraPosition();
        } else if (this.dragButton === 1 || this.dragButton === 2) {
            // 中键或右键：平移
            // 计算相机的右向量和上向量
            const cameraPos = vec3.fromValues(
                this.target[0] + this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth),
                this.target[1] + this.distance * Math.sin(this.elevation),
                this.target[2] + this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth)
            );
            
            const forward = vec3.create();
            vec3.subtract(forward, this.target, cameraPos);
            vec3.normalize(forward, forward);
            
            const right = vec3.create();
            vec3.cross(right, forward, vec3.fromValues(0, 1, 0));
            vec3.normalize(right, right);
            
            const up = vec3.create();
            vec3.cross(up, right, forward);
            vec3.normalize(up, up);
            
            // 平移目标点
            const panRight = vec3.create();
            vec3.scale(panRight, right, -deltaX * this.panSpeed);
            
            const panUp = vec3.create();
            vec3.scale(panUp, up, deltaY * this.panSpeed);
            
            vec3.add(this.target, this.target, panRight);
            vec3.add(this.target, this.target, panUp);
            
            this.updateCameraPosition();
        }
        
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
    }

    /**
     * 鼠标释放事件
     */
    private onMouseUp(e: MouseEvent) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }

    /**
     * 滚轮事件（缩放）
     */
    private onWheel(e: WheelEvent) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 1 + this.zoomSpeed : 1 - this.zoomSpeed;
        this.distance *= delta;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        
        this.updateCameraPosition();
    }

    /**
     * 阻止右键菜单
     */
    private onContextMenu(e: MouseEvent) {
        e.preventDefault();
    }

    /**
     * 销毁控制器，移除事件监听
     */
    destroy() {
        this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
        this.canvas.removeEventListener('mouseleave', this.mouseUpHandler);
        this.canvas.removeEventListener('wheel', this.wheelHandler);
        this.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
    }
}

