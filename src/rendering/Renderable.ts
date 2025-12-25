import { Mesh } from "../core/types/Mesh"
import { mat4 } from "gl-matrix"

/**
 * Renderable 表示场景中一个可渲染的对象
 * 包含 Mesh 和变换矩阵
 */
export class Renderable {
    mesh: Mesh
    private _transform: mat4 = mat4.create()
    private _position: [number, number, number] = [0, 0, 0]
    private _rotation: [number, number, number] = [0, 0, 0]
    private _scale: [number, number, number] = [1, 1, 1]
    private _transformDirty: boolean = true

    constructor(mesh: Mesh) {
        this.mesh = mesh
    }

    setPosition(x: number, y: number, z: number) {
        this._position = [x, y, z]
        this._transformDirty = true
    }

    setRotation(x: number, y: number, z: number) {
        this._rotation = [x, y, z]
        this._transformDirty = true
    }

    setScale(x: number, y: number, z: number) {
        this._scale = [x, y, z]
        this._transformDirty = true
    }

    getTransform(): mat4 {
        if (this._transformDirty) {
            mat4.identity(this._transform)
            mat4.translate(this._transform, this._transform, this._position)
            mat4.rotateX(this._transform, this._transform, this._rotation[0])
            mat4.rotateY(this._transform, this._transform, this._rotation[1])
            mat4.rotateZ(this._transform, this._transform, this._rotation[2])
            mat4.scale(this._transform, this._transform, this._scale)
            this._transformDirty = false
        }
        return this._transform
    }

    getRotation(): [number, number, number] {
        return [...this._rotation] as [number, number, number]
    }

    addRotation(deltaX: number, deltaY: number, deltaZ: number) {
        this._rotation[0] += deltaX
        this._rotation[1] += deltaY
        this._rotation[2] += deltaZ
        this._transformDirty = true
    }
}

