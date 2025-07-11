/// <reference types="@webgpu/types" />

export interface FramebufferOptions {
  width?: number
  height?: number
  format?: GPUTextureFormat
  label?: string
  multisampled?: boolean
  sampleCount?: number
}

export interface Framebuffer {
  texture: GPUTexture
  view: GPUTextureView
  depthTexture?: GPUTexture
  depthView?: GPUTextureView
  renderPassDescriptor: GPURenderPassDescriptor
  width: number
  height: number
  resize: (width: number, height: number) => void
  destroy: () => void
}

export function createFramebuffer(
  device: GPUDevice,
  options: FramebufferOptions = {}
): Framebuffer {
  const {
    width = 512,
    height = 512,
    format = 'rgba8unorm',
    label = 'Framebuffer',
    multisampled = false,
    sampleCount = 4
  } = options

  let texture: GPUTexture
  let view: GPUTextureView
  let depthTexture: GPUTexture | undefined
  let depthView: GPUTextureView | undefined
  let renderPassDescriptor: GPURenderPassDescriptor

  function createTextures(w: number, h: number) {
    // Create color texture
    texture = device.createTexture({
      label: `${label} Color Texture`,
      size: { width: w, height: h },
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      sampleCount: multisampled ? sampleCount : 1
    })

    view = texture.createView({
      label: `${label} Color View`
    })

    // Create depth texture
    depthTexture = device.createTexture({
      label: `${label} Depth Texture`,
      size: { width: w, height: h },
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: multisampled ? sampleCount : 1
    })

    depthView = depthTexture.createView({
      label: `${label} Depth View`
    })

    // Create render pass descriptor
    renderPassDescriptor = {
      label: `${label} Render Pass`,
      colorAttachments: [
        {
          view: view,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
      depthStencilAttachment: {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    }
  }

  // Initial texture creation
  createTextures(width, height)

  function resize(newWidth: number, newHeight: number) {
    // Destroy old textures
    texture?.destroy()
    depthTexture?.destroy()

    // Create new textures with new size
    createTextures(newWidth, newHeight)
  }

  function destroy() {
    texture?.destroy()
    depthTexture?.destroy()
  }

  return {
    get texture() {
      return texture
    },
    get view() {
      return view
    },
    get depthTexture() {
      return depthTexture
    },
    get depthView() {
      return depthView
    },
    get renderPassDescriptor() {
      return renderPassDescriptor
    },
    width,
    height,
    resize,
    destroy
  }
}

export interface RefractionFramebuffers {
  main: Framebuffer
  back: Framebuffer
}

export function createRefractionFramebuffers(
  device: GPUDevice,
  width: number,
  height: number,
  format?: GPUTextureFormat
): RefractionFramebuffers {
  const main = createFramebuffer(device, {
    width,
    height,
    format,
    label: 'Main Scene FBO'
  })

  const back = createFramebuffer(device, {
    width,
    height,
    format,
    label: 'Back Scene FBO'
  })

  return { main, back }
}
