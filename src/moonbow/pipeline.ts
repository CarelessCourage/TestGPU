import type { GPUCanvas } from './target.js'
import { bufferLayout } from './geometry/utils.js'

interface PipelineOptions {
  uniforms: UB[]
  shader: string
  wireframe?: boolean
}

export interface Pipeline {
  pipeline: GPURenderPipeline
  bindGroup: GPUBindGroup
}

export function gpuPipeline(
  { device, format }: GPUCanvas,
  { uniforms, shader, wireframe = false }: PipelineOptions
): Pipeline {
  const entries = getEntries(device, uniforms)

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: shader
  })

  const pipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [entries.layout]
    }),
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: bufferLayout()
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format }]
    },
    primitive: {
      topology: wireframe ? 'line-list' : 'triangle-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    },
    depthStencil: {
      // this makes sure that faces get rendered in the correct order.
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus'
    }
  })

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = device.createBindGroup({
    label: 'Cell renderer bind group',
    layout: entries.layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
    entries: entries.bindGroup
  })

  return {
    pipeline: pipeline,
    bindGroup: bindGroup
  }
}

function getEntries(
  device: GPUDevice,
  uniforms: UB[]
): {
  layout: GPUBindGroupLayout
  bindGroup: GPUBindGroupEntry[]
} {
  const entries = uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    buffer: { type: 'uniform' as GPUBufferBindingType },
    resource: { buffer: uniform.buffer }
  }))

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: entries.map((entry) => ({
      binding: entry.binding,
      visibility: entry.visibility,
      buffer: { type: 'uniform' }
    }))
  })

  return {
    layout: bindGroupLayout,
    bindGroup: entries
  }
}

export function uTime(device: GPUDevice) {
  let time = 50
  return uniformBuffer(device, {
    label: 'Time Buffer',
    binding: undefined,
    update: (buffer) => {
      time++
      device.queue.writeBuffer(buffer, 0, new Uint32Array([time]))
      return time
    }
  })
}

export const f32 = (device: GPUDevice, value: number[]) => {
  const data = new Float32Array(value)
  return uniformBuffer(device, {
    size: data.byteLength,
    binding: undefined,
    update: (buffer) => {
      device.queue.writeBuffer(buffer, 0, data)
    }
  })
}

export const vec3 = (device: GPUDevice, value: number) =>
  uniformBuffer(device, {
    size: 12,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, new Uint32Array([value]))
  })

export const vec4 = (device: GPUDevice, value: number) =>
  uniformBuffer(device, {
    size: 16,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, new Uint32Array([value]))
  })

interface UB {
  binding?: number
  visibility?: number
  buffer: GPUBuffer
  update: () => void
}

export interface UBI {
  device: GPUDevice
}

interface UBOptions {
  label?: string
  size?: number
  binding?: number
  visibility?: number
  update: (buffer: GPUBuffer) => void
}

export function uniformBuffer(device: GPUDevice, options: UBOptions): UB {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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
