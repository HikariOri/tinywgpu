import { Mesh } from "./types/Mesh"
import { BufferManager } from "./BufferManager"

/**
 * 工具类：创建常用几何体
 */
export class MeshBuilder {
    /**
     * 创建正方体 Mesh
     */
    static createCube(bufferManager: BufferManager, size: number = 1.0): Mesh {
        const halfSize = size / 2
        
        // 正方体的 8 个顶点（位置 + 颜色）
        const vertices = new Float32Array([
            // 前面 (z = +halfSize)
            -halfSize, -halfSize,  halfSize,  1.0, 0.0, 0.0, 1.0, // 0
             halfSize, -halfSize,  halfSize,  0.0, 1.0, 0.0, 1.0, // 1
             halfSize,  halfSize,  halfSize,  0.0, 0.0, 1.0, 1.0, // 2
            -halfSize,  halfSize,  halfSize,  1.0, 1.0, 0.0, 1.0, // 3
            // 后面 (z = -halfSize)
            -halfSize, -halfSize, -halfSize,  1.0, 0.0, 1.0, 1.0, // 4
             halfSize, -halfSize, -halfSize,  0.0, 1.0, 1.0, 1.0, // 5
             halfSize,  halfSize, -halfSize,  0.5, 0.5, 0.5, 1.0, // 6
            -halfSize,  halfSize, -halfSize,  1.0, 1.0, 1.0, 1.0, // 7
        ])

        // 索引（每个面 2 个三角形）
        const indices = new Uint16Array([
            // 前面
            0, 1, 2,  2, 3, 0,
            // 后面
            4, 6, 5,  6, 4, 7,
            // 上面
            3, 2, 6,  6, 7, 3,
            // 下面
            0, 5, 1,  5, 0, 4,
            // 右面
            1, 5, 6,  6, 2, 1,
            // 左面
            0, 3, 7,  7, 4, 0,
        ])

        const vertexBuffer = bufferManager.createVertexBuffer(vertices, 'Cube vertices');
        const indexBuffer = bufferManager.createIndexBuffer(indices, 'Cube indices');

        return {
            vertexBuffer,
            indexBuffer,
            indexCount: indices.length,
            vertexCount: vertices.length / 7, // 每个顶点 7 个 float (3 pos + 4 color)
        }
    }
}

