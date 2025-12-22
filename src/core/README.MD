通常一个 WebGPU 应用只需要一个 GPUDevice。

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