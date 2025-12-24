import { ICamera } from "./types/ICamera"
import { Scene } from "./Scene"
import { RenderTarget } from "./types/RenderTarget"
import { mat4 } from "gl-matrix"

/**
 * 基础 Camera 实现
 * 支持透视投影和视图矩阵计算
 */
export class PerspectiveCamera implements ICamera {
    readonly scene: Scene
    readonly target: RenderTarget
    enabled: boolean = true
    order: number = 0

    // 位置和旋转
    private _position: [number, number, number] = [0, 0, 0]
    private _rotation: [number, number, number] = [0, 0, 0]
    
    // 投影参数
    private _fov: number = 45 // 视野角度（度）
    private _aspect: number = 1 // 宽高比
    private _near: number = 0.1
    private _far: number = 1000

    // 缓存的矩阵
    private _viewMatrix: mat4 = mat4.create()
    private _projectionMatrix: mat4 = mat4.create()
    private _viewMatrixDirty: boolean = true
    private _projectionMatrixDirty: boolean = true

    constructor(scene: Scene, target: RenderTarget) {
        this.scene = scene
        this.target = target
        // Camera 需要被添加到 Scene 中
        ;(scene as any).addCamera(this)
    }

    setPosition(x: number, y: number, z: number) {
        this._position = [x, y, z]
        this._viewMatrixDirty = true
    }

    setRotation(x: number, y: number, z: number) {
        this._rotation = [x, y, z]
        this._viewMatrixDirty = true
    }

    /**
     * 使用 lookAt 方法设置相机朝向
     * @param eye 相机位置
     * @param target 目标点
     * @param up 上向量（默认 [0, 1, 0]）
     */
    lookAt(eye: [number, number, number], target: [number, number, number], up: [number, number, number] = [0, 1, 0]) {
        this._position = eye
        // 直接使用 lookAt 计算视图矩阵
        mat4.lookAt(this._viewMatrix, eye, target, up)
        this._viewMatrixDirty = false
    }

    setProjection(fov: number, aspect: number, near: number, far: number) {
        this._fov = fov
        this._aspect = aspect
        this._near = near
        this._far = far
        this._projectionMatrixDirty = true
    }

    getViewMatrix(): mat4 {
        if (this._viewMatrixDirty) {
            this.updateViewMatrix()
            this._viewMatrixDirty = false
        }
        return this._viewMatrix
    }

    getProjectionMatrix(): mat4 {
        if (this._projectionMatrixDirty) {
            this.updateProjectionMatrix()
            this._projectionMatrixDirty = false
        }
        return this._projectionMatrix
    }

    private updateViewMatrix() {
        mat4.identity(this._viewMatrix)
        
        // 应用旋转
        mat4.rotateX(this._viewMatrix, this._viewMatrix, this._rotation[0])
        mat4.rotateY(this._viewMatrix, this._viewMatrix, this._rotation[1])
        mat4.rotateZ(this._viewMatrix, this._viewMatrix, this._rotation[2])
        
        // 应用平移（取反，因为视图矩阵是相机到世界的逆变换）
        mat4.translate(this._viewMatrix, this._viewMatrix, [
            -this._position[0],
            -this._position[1],
            -this._position[2]
        ])
    }

    private updateProjectionMatrix() {
        mat4.perspective(
            this._projectionMatrix,
            (this._fov * Math.PI) / 180,
            this._aspect,
            this._near,
            this._far
        )
    }

    // 更新宽高比（当 RenderTarget 尺寸变化时调用）
    updateAspect(aspect: number) {
        if (this._aspect !== aspect) {
            this._aspect = aspect
            this._projectionMatrixDirty = true
        }
    }
}

