import type { GPUCanvas } from './target.js'
import type { Pipeline } from './pipeline.js'
import type { GeoBuffers } from './geometry/utils.js'

function getDepthStencil(
  device: GPUDevice,
  element: Pick<HTMLCanvasElement, 'height' | 'width'>
): GPURenderPassDepthStencilAttachment {
  const depthTexture = device.createTexture({
    size: [element.width, element.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  })

  return {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: 'clear',
    depthStoreOp: 'store'
  }
}

export type RenderOutput = ReturnType<typeof render>

export function render(props: GPUCanvas, pipeline: Pipeline) {
  const depthStencil = getDepthStencil(props.device, props.context.canvas)

  const scene = (callback: (render: Renderer) => void) => ({
    draw: () => draw(callback)
  })

  function draw(callback?: (render: Renderer) => void) {
    const render = initRender(props, depthStencil)
    applyPipeline(render.passEncoder, pipeline)
    callback?.(render)
    submitPass(props.device, render)
  }

  return {
    draw: draw,
    scene: scene,
    pipeline: pipeline,
    frame: (callback: (render: Renderer) => void) => {
      setInterval(() => scene(callback).draw(), 1000 / 60)
    }
  }
}

type Renderer = ReturnType<typeof initRender>

function initRender(
  { device, context }: GPUCanvas,
  depthStencilAttachment: GPURenderPassDepthStencilAttachment
) {
  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
    depthStencilAttachment: depthStencilAttachment,
    colorAttachments: [
      {
        // @location(0), see fragment shader
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  })
  return { commandEncoder, passEncoder }
}

export function submitPass(
  device: GPUDevice,
  { commandEncoder, passEncoder }: Pick<Renderer, 'commandEncoder' | 'passEncoder'>
) {
  passEncoder.end()
  const commandBuffer = commandEncoder.finish()
  device.queue.submit([commandBuffer])
}

export function drawObject(passEncoder: GPURenderPassEncoder, buffer: GeoBuffers) {
  // Set Geometry
  passEncoder.setVertexBuffer(0, buffer.vertices)
  passEncoder.setVertexBuffer(1, buffer.normals)
  passEncoder.setVertexBuffer(2, buffer.uvs)

  // Draw Geometry
  passEncoder.setIndexBuffer(buffer.indices, 'uint16')
  passEncoder.drawIndexed(buffer.indicesCount, 1, 0, 0, 0)
}

export function applyPipeline(passEncoder: GPURenderPassEncoder, pipeline: Pipeline) {
  // Pass Pipeline
  passEncoder.setPipeline(pipeline.pipeline)
  passEncoder.setBindGroup(0, pipeline.bindGroup)
}
