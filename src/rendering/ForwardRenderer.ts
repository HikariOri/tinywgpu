import { IRenderer } from "../core/types/IRenderer";
import { RenderContext } from "../core/types/RenderContext";
import { PerspectiveCamera } from "../core/Camera";
import { mat4 } from "gl-matrix";
import { BufferManager } from "../core/BufferManager";
import { PipelineManager } from "../core/PipelineManager";
import { CanvasManager } from "../core/CanvasManager";
import { ResourceManager } from "../core/ResourceManager";

/**
 * 基础前向渲染器
 * 实现 IRenderer 接口，支持多种渲染器的扩展
 * 
 * 注意：Renderer 使用的 Device 和资源管理器都是共享的（由 RenderSystem 提供）
 * 多个 Renderer 实例会共享同一个 Device 和资源管理器
 */
export class ForwardRenderer implements IRenderer {
    /** Renderer 类型标识 */
    readonly type: string = 'ForwardRenderer';

    /** 渲染优先级（数字越小优先级越高） */
    readonly priority: number = 0;

    // 使用 readonly 明确这些资源是共享的，不应被替换
    protected readonly device: GPUDevice;
    protected readonly bufferManager: BufferManager;
    protected readonly pipelineManager: PipelineManager;
    protected readonly canvasManager: CanvasManager;
    protected readonly resourceManager: ResourceManager;

    private _uniformBuffer: GPUBuffer | null = null;

    constructor(
        device: GPUDevice,  // 共享的 Device（由 RenderSystem 提供）
        bufferManager: BufferManager,  // 共享的资源管理器
        pipelineManager: PipelineManager,
        canvasManager: CanvasManager,
        resourceManager: ResourceManager,
    ) {
        this.device = device;
        this.bufferManager = bufferManager;
        this.pipelineManager = pipelineManager;
        this.canvasManager = canvasManager;
        this.resourceManager = resourceManager;
    }

    /**
     * 执行渲染（IRenderer 接口）
     */
    render(
        commandEncoder: GPUCommandEncoder,
        context: RenderContext
    ): void {
        const { camera, textureView, width, height, format } = context;

        // 更新 Camera 的宽高比
        if (camera instanceof PerspectiveCamera) {
            camera.updateAspect(width / height);
        }

        // 获取或创建渲染管线
        const pipelineKey = `basic_${format}`;
        let pipeline = this.pipelineManager.get(pipelineKey);
        
        // 如果管线尚未创建且不在创建队列中，则异步创建
        if (!pipeline && !this.pipelineManager.has(pipelineKey)) {
            // 异步创建管线，但不阻塞渲染循环
            this.pipelineManager.getOrCreateAsync(pipelineKey, () => 
                this.createRenderPipelineDescriptor(format)
            ).catch(err => {
                console.error(`Failed to create pipeline ${pipelineKey}:`, err);
            });
        }
        
        // 如果管线尚未就绪，跳过渲染
        if (!pipeline) {
            return;
        }

        // 创建 uniform buffer（存储 MVP 矩阵）
        if (!this._uniformBuffer) {
            this._uniformBuffer = this.bufferManager.createUniformBuffer(
                16 * 4 * 3, // 3 个 mat4 (model, view, projection)
                'MVP Uniform Buffer'
            );
        }

        // 开始渲染通道
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }]
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);

        // 渲染场景中的所有 Renderable
        const viewMatrix = camera.getViewMatrix();
        const projectionMatrix = camera.getProjectionMatrix();

        for (const renderable of camera.scene.renderables) {
            const modelMatrix = renderable.getTransform();

            // 更新 uniform buffer
            const uniformData = new Float32Array(16 * 3);
            uniformData.set(modelMatrix, 0);
            uniformData.set(viewMatrix, 16);
            uniformData.set(projectionMatrix, 32);

            this.device.queue.writeBuffer(this._uniformBuffer!, 0, uniformData);

            // 设置绑定组
            const bindGroup = this.device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: this._uniformBuffer!,
                    }
                }]
            });

            passEncoder.setBindGroup(0, bindGroup);

            // 绘制
            const mesh = renderable.mesh;
            passEncoder.setVertexBuffer(0, mesh.vertexBuffer);
            if (mesh.indexBuffer) {
                passEncoder.setIndexBuffer(mesh.indexBuffer, 'uint16');
                passEncoder.drawIndexed(mesh.indexCount);
            } else {
                passEncoder.draw(mesh.vertexCount);
            }
        }

        passEncoder.end();
    }

    /**
     * 创建默认的顶点着色器模块（用于加载失败时的 fallback）
     */
    private createDefaultVertexShaderModule(): GPUShaderModule {
        return this.device.createShaderModule({
            code: `
                struct Uniforms {
                    model: mat4x4<f32>,
                    view: mat4x4<f32>,
                    projection: mat4x4<f32>,
                }
                @group(0) @binding(0) var<uniform> uniforms: Uniforms;

                struct VertexInput {
                    @location(0) position: vec3<f32>,
                    @location(1) color: vec4<f32>,
                }

                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) color: vec4<f32>,
                }

                @vertex
                fn vs_main(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    let mvp = uniforms.projection * uniforms.view * uniforms.model;
                    output.position = mvp * vec4<f32>(input.position, 1.0);
                    output.color = input.color;
                    return output;
                }
            `
        });
    }

    /**
     * 创建默认的片段着色器模块（用于加载失败时的 fallback）
     */
    private createDefaultFragmentShaderModule(): GPUShaderModule {
        return this.device.createShaderModule({
            code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) color: vec4<f32>,
                }

                @fragment
                fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
                    return input.color;
                }
            `
        });
    }

    /**
     * 清理资源
     */
    dispose(): void {
        // 清理 uniform buffer 等资源
        // 注意：由于资源是共享的，这里只清理 Renderer 自己创建的资源
        this._uniformBuffer = null;
    }

    /**
     * 创建渲染管线描述符
     */
    private async createRenderPipelineDescriptor(format: GPUTextureFormat): Promise<GPURenderPipelineDescriptor> {
        const vsModule = await this.resourceManager.getShaderManager()?.loadVertexShader('../shaders/basic.vert.wgsl') || 
            this.createDefaultVertexShaderModule();
        const fsModule = await this.resourceManager.getShaderManager()?.loadFragmentShader('../shaders/basic.frag.wgsl') || 
            this.createDefaultFragmentShaderModule();
        // const vsModule = this.device.createShaderModule({
        //     code: `
        //         struct Uniforms {
        //             model: mat4x4<f32>,
        //             view: mat4x4<f32>,
        //             projection: mat4x4<f32>,
        //         }
        //         @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        //         struct VertexInput {
        //             @location(0) position: vec3<f32>,
        //             @location(1) color: vec4<f32>,
        //         }

        //         struct VertexOutput {
        //             @builtin(position) position: vec4<f32>,
        //             @location(0) color: vec4<f32>,
        //         }

        //         @vertex
        //         fn vs_main(input: VertexInput) -> VertexOutput {
        //             var output: VertexOutput;
        //             let mvp = uniforms.projection * uniforms.view * uniforms.model;
        //             output.position = mvp * vec4<f32>(input.position, 1.0);
        //             output.color = input.color;
        //             return output;
        //         }
        //     `
        // });

        // const fsModule = this.device.createShaderModule({
        //     code: `
        //         struct VertexOutput {
        //             @builtin(position) position: vec4<f32>,
        //             @location(0) color: vec4<f32>,
        //         }

        //         @fragment
        //         fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        //             return input.color;
        //         }
        //     `
        // });

        return {
            layout: 'auto',
            vertex: {
                module: vsModule!,
                entryPoint: 'vs_main',
                buffers: [{
                    arrayStride: 7 * 4, // 3 floats (position) + 4 floats (color)
                    attributes: [
                        { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
                        { shaderLocation: 1, offset: 12, format: 'float32x4' }, // color
                    ]
                }]
            },
            fragment: {
                module: fsModule!,
                entryPoint: 'fs_main',
                targets: [{ format }]
            },
            primitive: {
                topology: 'triangle-list',
                cullMode: 'back',
            },
            depthStencil: undefined,
        };
    }
}
