import type { GPUCanvas } from './target.js'
import type { Pipeline } from './pipeline.js'
import type { GeoBuffers } from './geometry/utils.js'

export interface RenderOutput {
  frame: (callback: (render: Renderer) => void) => void
  draw: (callback: (render: Renderer) => void) => void
  scene: (callback: (render: Renderer) => void) => {
    draw: () => void
  }
}

export function render(props: GPUCanvas, pipeline: Pipeline): RenderOutput {
  const depthTexture = props.device.createTexture({
    size: [props.element.width, props.element.height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  })

  const scene = (callback: (render: Renderer) => void) => ({
    draw: () => draw(callback)
  })

  function draw(callback: (render: Renderer) => void) {
    const render = initRender(props, depthTexture)
    applyPipeline(render.pass, pipeline)
    callback(render)
    submitPass(props.device, render)
  }

  return {
    draw: draw,
    scene: scene,
    frame: (callback: (render: Renderer) => void) => {
      setInterval(() => scene(callback).draw(), 1000 / 60)
    }
  }
}

function frame(callback: (render: Renderer) => void) {
  setInterval(() => callback, 1000 / 60)
}

interface Renderer {
  encoder: GPUCommandEncoder
  pass: GPURenderPassEncoder
}

function initRender({ device, context }: GPUCanvas, depthTexture: GPUTexture): Renderer {
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        // @location(0), see fragment shader
        view: context.getCurrentTexture().createView(),
        loadOp: 'clear',
        clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1 },
        storeOp: 'store'
      }
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store'
    }
  })
  return { encoder, pass }
}

function submitPass(device: GPUDevice, { encoder, pass }: Renderer) {
  pass.end()
  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}

export function drawObject(pass: GPURenderPassEncoder, buffer: GeoBuffers) {
  // Set Geometry
  pass.setVertexBuffer(0, buffer.vertices)
  pass.setVertexBuffer(1, buffer.normals)
  pass.setVertexBuffer(2, buffer.uvs)

  // Draw Geometry
  pass.setIndexBuffer(buffer.indices, 'uint16')
  pass.drawIndexed(buffer.indicesCount, 1, 0, 0, 0)
}

export function applyPipeline(pass: GPURenderPassEncoder, pipeline: Pipeline) {
  // Pass Pipeline
  pass.setPipeline(pipeline.pipeline)
  pass.setBindGroup(0, pipeline.bindGroup)
}
