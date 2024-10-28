import type { GPUCanvas, Pipeline } from '../'
import { getDepthStencil } from './utils'

export function renderPass({
  device,
  context,
  model
}: Pick<GPUCanvas, 'device' | 'context'> & { model: boolean }) {
  const depthStencil = getDepthStencil(device, context.canvas)
  const commandEncoder = device.createCommandEncoder()

  const passEncoder = commandEncoder.beginRenderPass({
    depthStencilAttachment: model ? depthStencil : undefined,
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

  function drawPass(pipeline: Pick<Pipeline<any, any>, 'bindGroup' | 'pipeline'>) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  return {
    drawPass,
    submitPass,
    passEncoder,
    commandEncoder
  }
}

export type MoonbowRender = ReturnType<typeof renderPass>
