import type { GPUCanvas, Pipeline } from '../moonbow'

export interface MoonbowEncoder {
  commandEncoder: GPUCommandEncoder
  passEncoder: GPURenderPassEncoder
}

export function renderFrame({ device, context }: Pick<GPUCanvas, 'device' | 'context'>) {
  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
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

  function drawPass(pipeline: Pick<Pipeline, 'bindGroup' | 'pipeline'>) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
    passEncoder.draw(3, 1, 0, 0)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  function frame(
    pipeline: Pick<Pipeline, 'bindGroup' | 'pipeline'>,
    callback?: (encoder: MoonbowEncoder) => void
  ) {
    drawPass(pipeline)
    callback?.({
      commandEncoder,
      passEncoder
    })
    submitPass()
  }

  return {
    commandEncoder,
    passEncoder,
    drawPass,
    submitPass,
    frame
  }
}
