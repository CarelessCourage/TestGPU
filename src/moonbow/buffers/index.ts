import type { TgpuBuffer } from 'typegpu'

export interface UniformBuffer {
  binding?: number
  visibility?: number
  buffer: GPUBuffer
  bufferType?: GPUBufferBindingType
  update: () => void
  tgpuBuffer?: TgpuBuffer<any>
  write?: (data: any) => void
}

interface UBOptions {
  label?: string
  size?: number
  binding?: number
  visibility?: number
  usage?: GPUBufferUsageFlags
  update: (buffer: GPUBuffer) => void
}

export function uniformBuffer(device: GPUDevice, options: UBOptions): UniformBuffer {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  const defaultUsage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: options.usage || defaultUsage
  })

  // Passes the buffer to the update callback
  options.update(buffer)
  return {
    binding: options.binding,
    visibility: options.visibility || defaultVisibility,
    buffer: buffer,
    update: () => options.update(buffer)
  }
}

export function storageBuffer(device: GPUDevice, options: UBOptions): UniformBuffer {
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: options.usage || GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  // Passes the buffer to the update callback
  options.update(buffer)
  return {
    binding: options.binding,
    visibility: options.visibility,
    buffer: buffer,
    update: () => options.update(buffer)
  }
}
