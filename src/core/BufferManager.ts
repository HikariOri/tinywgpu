/**
 * BufferManager 管理 GPU Buffer 的创建
 * 封装 buffer 创建逻辑，提供统一的接口
 */
export class BufferManager {
    private device: GPUDevice;

    constructor(device: GPUDevice) {
        this.device = device;
    }

    /**
     * 创建顶点缓冲区
     */
    createVertexBuffer(data: ArrayBufferView, label?: string): GPUBuffer {
        const buffer = this.device.createBuffer({
            label: label || 'Vertex buffer',
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        const mappedRange = buffer.getMappedRange();
        new Uint8Array(mappedRange).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        buffer.unmap();
        return buffer;
    }

    /**
     * 创建索引缓冲区
     */
    createIndexBuffer(data: ArrayBufferView, label?: string): GPUBuffer {
        const buffer = this.device.createBuffer({
            label: label || 'Index buffer',
            size: data.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true,
        });
        const mappedRange = buffer.getMappedRange();
        new Uint8Array(mappedRange).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        buffer.unmap();
        return buffer;
    }

    /**
     * 创建 Uniform 缓冲区
     */
    createUniformBuffer(size: number, label?: string): GPUBuffer {
        return this.device.createBuffer({
            label: label || 'Uniform buffer',
            size: size,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
    }

    /**
     * 创建通用缓冲区
     */
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
        return this.device.createBuffer(descriptor);
    }
}

