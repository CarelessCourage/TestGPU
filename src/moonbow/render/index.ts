import type { GPUCanvas, Pipeline } from '../'
import { getDepthStencil, initRender } from './utils'

export function renderPass({
  device,
  context,
  model
}: Pick<GPUCanvas, 'device' | 'context'> & { model: boolean }) {
  const depthStencil = getDepthStencil(device, context.canvas)
  const { passEncoder, commandEncoder } = initRender(
    { device, context },
    model ? depthStencil : undefined
  )

  function drawPass(pipeline: Pick<Pipeline, 'bindGroup' | 'pipeline'>) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
    // passEncoder.draw(3, 1, 0, 0)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  return {
    commandEncoder,
    passEncoder,
    drawPass,
    submitPass
  }
}
