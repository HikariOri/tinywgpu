/**
 * RenderTarget 表示渲染目标，可以是 Canvas 或离屏 Texture
 */
export type RenderTarget = 
    | { type: 'canvas'; canvasId: string }
    | { type: 'texture'; texture: GPUTexture; width: number; height: number }

