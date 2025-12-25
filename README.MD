# Quick Start

首先确保已经安装了 Node.js 和 npm

```bash
# 安装依赖
npm install
# 运行
npm run dev
```

# Architecture

通常一个 WebGPU 应用只需要一个 GPUDevice。

最开始将所有的Manager都放在了Engine下，并且由Engine启动RenderLoop，但是这样在写上层代码时经常需要将各个Manager注入，就比如在写一个MeshBuilder工具类时需要把BufferManger注入进来。

```
Renderer
 ├─ owns GPUDevice
 ├─ owns GPUResourceCache
 └─ executes render(scene, camera)
```

这是一种“所有权集中，而非访问集中”的架构设计

我问AI这样做是否合理，他说要注入的应该是 Capability / Context。但是我觉得这只是暂时的解决方式，更深层次来说，架构上就存在问题。

我又了解了一下诸如 Three.js 这种图形库是怎么做的，结果 Three.js 根本没有所谓的 Engine 对象。

在 Three.js 有不同的 Renderer，如 WebGPURenderer 或者 WebGLRenderer，Renderer 是是具体的 RenderBackend 实现。显然对于 WebGPURenderer，与 WebGPU 相关的资源都由它承载和管理。

因此我意识到，WebGPU 渲染系统必须围绕一个长期存活的 GPUDevice 构建，但这个 Device 应当被严格封装在渲染后端，而不是作为全局服务暴露。即 RenderSystem（或 RenderBackend）应当是 GPUDevice 的唯一拥有者

```
Engine
├─ Core
│   ├─ Engine.ts              （启动、关停、阶段切换）
│   ├─ Scheduler.ts           （主循环 / 帧调度）
│   └─ Time.ts
│
├─ World
│   ├─ Scene.ts
│   ├─ Entity.ts
│   ├─ Components
│   │    ├─ Transform
│   │    ├─ Mesh
│   │    ├─ Material
│   │    └─ Camera
│   └─ Systems
│        └─ LogicSystems      （纯逻辑，不接触 GPU）
│
├─ Assets                     ★ 核心层（异步世界）
│   ├─ AssetManager.ts
│   ├─ AssetState.ts
│   ├─ Loaders
│   │    ├─ ShaderLoader
│   │    ├─ TextureLoader
│   │    ├─ MeshLoader
│   │    └─ SceneLoader
│   ├─ Assets
│   │    ├─ ShaderAsset
│   │    ├─ TextureAsset
│   │    ├─ MeshAsset
│   │    └─ MaterialAsset
│   └─ Preparation
│        ├─ ScenePreparer.ts
│        └─ StreamingController.ts
│
├─ Rendering                  ★ 同步世界（GPU 边界）
│   ├─ Renderer.ts
│   ├─ Device
│   │    └─ GPUContext.ts
│   ├─ Resources
│   │    ├─ BufferManager
│   │    ├─ TextureManager
│   │    └─ SamplerManager
│   ├─ Pipelines
│   │    ├─ PipelineCache
│   │    ├─ PipelineLayoutCache
│   │    └─ FallbackPipelines
│   ├─ RenderGraph
│   │    ├─ RenderGraph.ts
│   │    ├─ Pass.ts
│   │    └─ FrameContext.ts
│   └─ Draw
│        ├─ RenderQueue.ts
│        └─ DrawEncoder.ts
│
├─ Presentation
│   ├─ CanvasManager.ts
│   └─ SwapChain.ts
│
└─ Debug / Tools
    ├─ ResourceInspector
    ├─ GPUStats
    └─ HotReload

```

然后 Scene 这块还应该重构，数据只是数据，和 GPU 侧无关。只有在实际渲染的时候才被 Renderer 编码至 GPUBuffer（等等？这块是不是应该做成懒加载）

## Render System

### Duty of Renderer

Renderer 的职责是“组织一帧的渲染结构”，这意味着不应该每个阶段一个 Renderer。

特别是如果给每个阶段都分别拆成一个 Renderer，最直接的问题就是资源依赖与顺序协调问题，然后这不就是在用 Renderer 做 RenderGraph 的工作。

一个 PBR 流程对应一个 Renderer，Renderer 是渲染策略的承载者。他负责管理跨越各个渲染阶段的资源（如深度图或者 GBuffer）和 Pass 顺序，Pass 使用资源但不拥有资源

### Correspond to Asset

Asset 从磁盘加载数据，但是这并非 WebGPU 能直接使用的，任何一个 AssetSystem 侧的资产类型均需要在 RenderSystem 侧有对应的数据。

```typescript
// 比如要是在 Asset 侧直接这么写，那职责边界就越了，Asset 侧本就不应该接触任何 WebGPU 的数据类型
async load(): Promise<GPUShaderModule> {
  const code = ...
  return device.createShaderModule({ code });
}
```

所以必须在 RenderSystem 侧留有接口，能够注册相关的 Asset Handle 为实际可以使用的 WebGPU 类型。

从而将 Asset 侧的逻辑资源与 RenderSystem 侧的 GPU 实体通过同一个 Handle 建立一一对应关系（狠狠滴依赖翻转了）

### Example by LOD

以 LOD 系统为例，看一下是怎么动态载入使用新资源的

主要核心实现在于 AssetManager 有 per-frame update

```
Engine Loop
│
├─ SceneManager.update()
│
├─ AssetManager.update(device)   ← ★ 就在这里
│
└─ RenderSystem.renderFrame()
```

大意如下：

```typescript
// 在此之前先收集 RenderItem 并检查对应的 Asset 状态
update(device: GPUDevice) {
    for (const asset of this.loadingAssets) {
        if (asset.state === Loaded) {
            asset.tryCreateGPU(device);
        }
    }
}
```

```typescript
if (!shader.isGPUReady()) {
    shader.requestLoad();          // 触发异步加载（一次）
    useFallbackPipeline();         // ⚠️ 核心
    continue;
}
```

## Assets System

异步加载资源是一个绕不开的话题。需要借助 Assets 模块把 Scene 想要的资源，变成 GPU 可以立即使用的资源句柄。换句话说，该模块向 RenderSystem 交付指代 WebGPU 内建数据结构的句柄，例如 GPUTexture。

Q：每种资源要分别有一种句柄吗？还是统一 IHandler

原则：
1. RenderLoop 不等待异步
2. 未 ready 的资源要有 fallback
3. 在“进入稳定渲染态之前”，加载所有“当前可预期会用到”的关键资源

我咨询了一下 AI，他说的是三阶段模型：

1. Bootstrap / Prepare（允许 await）
2. Stable Render Loop（禁止 await）
3. Streaming / Hot-load（后台异步）

我又咨询了一下 AI 关于 Three.JS 是怎么做的，他和我上面说的这套思想高度一致，只是它做了大量“工程妥协”，看起来没那么“干净”。

three.js 允许 RenderLoop 在资源不完整时继续运行，并通过“默认资源 + 条件编译 + needsUpdate 标记”来实现一致性。

### Core Concept

| 两个核心概念：IAsset 和 AssetRequest

IAsset 是一个被 AssetManager 管理的“资源实例”，有明确的状态和加载方式，但是并未被加工为 WebGPU 可以识别使用的资源。GPU 资源完全属于 RenderSystem

AssetRequest 从 Renderer 角度很自然地解决了一个问题：在不知道 Asset 是否存在之前，我如何表达我对它的需求？

所以 IAsset 在设计实现的时候不应当持有任何 GPU 资源

```typescript
export interface IAsset<TGPU = unknown> {
    readonly id: string;
    readonly type: AssetType;

    readonly state: AssetState;

    load(): Promise<void>;          // CPU 侧准备
    upload?(device: GPUDevice): void; // GPU 侧准备

    getGPUResource(): TGPU | null;  // 这个是不对的
}
```

当然折中方案是 IAsset 持有不透明 GPUHandle，AI 说 BGFX 是这样做的，此处待考证。但是更合理的方案是让它仅持有 CPU 资源，然后在 RenderSystem 侧进行加工。比如说原来是直接硬编码字符串作为着色器代码，现在改为 Asset 侧持有字符串，RenderSystem 侧根据需要进行编译。

```typescript
interface IAsset {
    readonly id: string;
    readonly state: AssetState;

    getCPUData(): unknown;
}
```

这自然引出了另外一个问题：在加载完为GPU资源之后，IAsset持有的CPU资源是否能够释放？

释放的行为是应当被实现的，但是释放的策略是需要仔细推敲的。应当是由 Asset 类型决定，按策略释放，且必须是“可恢复的释放”。

AI说 Filament 的做法是 CPU 数据保留到明确“资源不可再使用”为止。

这样一搞完整的过程示意如下：

```
Scene needs Shader A
  ↓
AssetManager ensures ShaderAsset loaded
  ↓
RenderSystem compiles GPUShaderModule
  ↓
ShaderAsset CPU source kept （我们认为针对 Shader 类资源应当常驻保存）
  ↓
GPUShaderModule cached in RenderSystem
```

```
Texture loaded
  ↓
GPUTexture created
  ↓
CPU image discarded (optional)
  ↓
Device lost
  ↓
Reload image → recreate GPUTexture
```


## Scene

SceneManager 不“理解”资产结构，只做聚合。他是“运行态场景的聚合与调度者”，而不是资源加载者，也不是 GPU 使用者。

# Note

| 这部分主要是记笔记

## Who Drives the RednerLoop

### Canvas

``` typescript
for (const canvas of canvasManager.canvases) {
    const renderer = rendererMap.get(canvas);
    renderer.render();
}
```

Canvas 不应该是“渲染驱动源”，他是一个输出目标，但它不等价于一个“渲染意图”。

特别是针对这种需求无法处理：

- 同一个 Canvas 渲染多个 Camera（分屏 / 画中画 / Debug View）
- 离屏渲染（无 Canvas）

> 同一个 Canvas 可以在一个 Frame 内，被多个 Camera 按顺序绘制到同一个 RenderTarget 上，是否叠加、如何叠加，由 Camera 的配置决定。

### Renderer

Engine 维护一个 Renderer 列表，直接遍历渲染

``` typescript
for (const renderer of renderers) {
    renderer.render();
}
```

就结论而言，Renderer 不是调度单位。为了从Renderer发起渲染，它必须额外输入 Scene、Camera 和 RenderTarget 等额外数据

# Duty

## Engine.ts

- 驱动 RenderLoop
- 维护 ActiveScene
- 构建 FrameContext

Engine 不关心 Scene 内部结构

## CanvasManager

- HTMLCanvasElement
- GPUCanvasContext
- Format / Resize / Present

## Camera

- 拥有 View / Projection
- 决定 RenderTarget（Canvas or Texture）
- 绑定 Renderer

## SceneManager

将渲染什么、按什么顺序渲染的决策职责由 Engine 下放给 SceneManager

## Scene

Scene 是“参与渲染的数据容器”，不是“渲染调度单位”。scene 自己决定不了是否要被渲染，只有 Camera 才能决定。引擎真正关心的不是“有哪些 Scene”，而是：
这一帧“需要渲染哪些 Camera，以什么顺序，渲染到哪里”。即 RenderStack，Scene 只为之提供“候选 Camera”