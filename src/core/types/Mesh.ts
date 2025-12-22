/**
 * Mesh 表示一个可渲染的几何体
 */
export interface Mesh {
    /** 顶点缓冲区 */
    vertexBuffer: GPUBuffer
    /** 索引缓冲区（可选） */
    indexBuffer?: GPUBuffer
    /** 索引数量 */
    indexCount: number
    /** 顶点数量 */
    vertexCount: number
}

