import type { GPUCanvas } from '../'

export function getDepthStencil(
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

export function initRender(
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

export type MoonbowEncoder = ReturnType<typeof initRender>
