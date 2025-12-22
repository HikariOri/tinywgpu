import { CanvasManager } from "./CanvasManager";
import { SceneManager } from "./SceneManager";
import { PipelineManager } from "./PipelineManager";
import { ICamera } from "./types/ICamera";
import { RenderTarget } from "./types/RenderTarget";
import { Renderable } from "./Renderable";
import { PerspectiveCamera } from "./Camera";
import { mat4 } from "gl-matrix";

interface FrameContext {
    commandEncoder: GPUCommandEncoder;
    lastDeltaTime: number;
}

export class Engine {
    private _device: GPUDevice | null = null;
    private adapter: GPUAdapter | null = null;
    private context: GPUCanvasContext | null = null;
    private _initialized: boolean = false;
    public readonly canvasManager: CanvasManager;
    public readonly sceneManager: SceneManager;
    public readonly pipelineManager: PipelineManager;

    private _uniformBuffer: GPUBuffer | null = null;
    private _lastFrameTime: number = 0;

    constructor(adapter: GPUAdapter, device: GPUDevice) {
        this.adapter = adapter;
        this._device = device;
        this.canvasManager = new CanvasManager();
        this.sceneManager = new SceneManager();
        this.pipelineManager = new PipelineManager(device);
        this._initialized = true;
    }

    /**
     * 所有事情进行前的第一步：创建引擎实例
     */
    public static async Create(): Promise<Engine> {
        if (!navigator.gpu) {
            throw Error("WebGPU not supported.");
        }

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw Error("Couldn't request WebGPU adapter.");
        }

        const device = await adapter.requestDevice();
        return new Engine(adapter, device);
    }

    public RenderLoop() {
        const frame = this.beginFrame();

        this.buildRenderStack();

        for (const camera of this.sceneManager.getRenderCameras()) {
            this.renderCamera(camera, frame.commandEncoder);
        }

        this.endFrame(frame);
    }

    private beginFrame(): FrameContext {
        const now = performance.now();
        const deltaTime = this._lastFrameTime === 0 ? 0 : (now - this._lastFrameTime) / 1000;
        this._lastFrameTime = now;

        const commandEncoder = this._device!.createCommandEncoder();

        return {
            commandEncoder,
            lastDeltaTime: deltaTime
        };
    }

    private buildRenderStack() {
        const now = performance.now();
        const deltaTime = this._lastFrameTime === 0 ? 0 : (now - this._lastFrameTime) / 1000;
        this.sceneManager.update(deltaTime);
    }

    private endFrame(frame: FrameContext) {
        this._device!.queue.submit([frame.commandEncoder.finish()]);
    }

    private renderCamera(camera: ICamera, commandEncoder: GPUCommandEncoder) {
        const device = this._device!;
        const target = camera.target;

        // 获取渲染目标
        let textureView: GPUTextureView;
        let width: number;
        let height: number;
        let format: GPUTextureFormat;

        if (target.type === 'canvas') {
            const canvasContext = this.canvasManager.getContext(target.canvasId);
            if (!canvasContext) {
                console.warn(`Canvas context not found: ${target.canvasId}`);
                return;
            }
            const texture = canvasContext.getCurrentTexture();
            textureView = texture.createView();
            width = texture.width;
            height = texture.height;
            format = navigator.gpu!.getPreferredCanvasFormat();

            // 更新 Camera 的宽高比
            if (camera instanceof PerspectiveCamera) {
                camera.updateAspect(width / height);
            }
        } else {
            textureView = target.texture.createView();
            width = target.width;
            height = target.height;
            // 对于离屏 texture，使用默认的 canvas format（实际应用中应该在 RenderTarget 中存储 format）
            format = navigator.gpu!.getPreferredCanvasFormat();
        }

        // 获取或创建渲染管线
        const pipelineKey = `basic_${format}`;
        const pipeline = this.pipelineManager.getOrCreate(pipelineKey, () => 
            this._createRenderPipelineDescriptor(format)
        );

        // 创建 uniform buffer（存储 MVP 矩阵）
        if (!this._uniformBuffer) {
            this._uniformBuffer = device.createBuffer({
                size: 16 * 4 * 3, // 3 个 mat4 (model, view, projection)
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
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

            // 计算 MVP 矩阵
            const mvp = mat4.create();
            mat4.multiply(mvp, projectionMatrix, viewMatrix);
            mat4.multiply(mvp, mvp, modelMatrix);

            // 更新 uniform buffer
            const uniformData = new Float32Array(16 * 3);
            uniformData.set(modelMatrix, 0);
            uniformData.set(viewMatrix, 16);
            uniformData.set(projectionMatrix, 32);

            device.queue.writeBuffer(this._uniformBuffer!, 0, uniformData);

            // 设置绑定组
            const bindGroup = device.createBindGroup({
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

    private _createRenderPipelineDescriptor(
        format: GPUTextureFormat
    ): GPURenderPipelineDescriptor {
        const device = this._device!;
        const vsModule = device.createShaderModule({
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

        const fsModule = device.createShaderModule({
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

        return {
            layout: 'auto',
            vertex: {
                module: vsModule,
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
                module: fsModule,
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

    private showError(message: string) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        console.error(message);
    }

    // 获取device的公共方法
    public getDevice(): GPUDevice | null {
        return this._device;
    }

    // 获取adapter的公共方法
    public getAdapter(): GPUAdapter | null {
        return this.adapter;
    }

    // 获取canvas的公共方法（通过 canvasManager）
    public getCanvas(canvasId?: string): HTMLCanvasElement | null {
        if (!canvasId) {
            // 返回第一个 canvas（如果有的话）
            // 实际应用中可能需要更好的方式
            return null;
        }
        const context = this.canvasManager.getContext(canvasId);
        return context ? (context as any).canvas : null;
    }

    // 获取context的公共方法
    public getContext(): GPUCanvasContext | null {
        return this.context;
    }
}