import type { GPUCanvas, Pipeline } from '../moonbow'

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

function initRender(
  { device, context }: Pick<GPUCanvas, 'device' | 'context'>,
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment
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

export interface MoonbowEncoder {
  commandEncoder: GPUCommandEncoder
  passEncoder: GPURenderPassEncoder
}

export function renderFrame({
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
