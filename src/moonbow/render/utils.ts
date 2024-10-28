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
