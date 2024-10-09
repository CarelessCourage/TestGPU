import type { GPUCanvas } from './target.js'
import { bufferLayout } from './geometry/utils.js'
interface PipelineOptions {
  uniforms: UB[]
  shader: string
  wireframe?: boolean
}

interface PipelineOptions2 {
  uniforms: UB[]
  storage: [SB, SB]
  shader: string
  wireframe?: boolean
}

export interface Pipeline {
  pipeline: GPURenderPipeline
  bindGroup: GPUBindGroup
}

export interface ComputePipeline {
  pipeline: GPURenderPipeline
  simulationPipeline: GPUComputePipeline
  bindGroup: GPUBindGroup
}
interface ComputePipeline2 {
  pipeline: GPURenderPipeline
  simulationPipeline: GPUComputePipeline
  bindGroups: [GPUBindGroup, GPUBindGroup]
}

export function gpuPipeline(
  { device, format }: GPUCanvas,
  { uniforms, shader, wireframe = false }: PipelineOptions
): Pipeline {
  const entries = getUniformEntries(device, uniforms, [])

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

export function gpuComputePipeline(
  { device, format }: GPUCanvas,
  { uniforms, storage, shader, wireframe = false }: PipelineOptions2
): ComputePipeline2 {
  const entries = getUniformEntries(device, uniforms, storage)

  // Create the compute shader that will process the simulation.
  const simulationShaderModule = device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: shader
  })

  const pipelineLayout = device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [entries.layout]
  })

  const pipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: pipelineLayout,
    vertex: {
      module: simulationShaderModule,
      entryPoint: 'vertexMain',
      buffers: bufferLayout()
    },
    fragment: {
      module: simulationShaderModule,
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

  // Create a compute pipeline that updates the game state.
  const simulationPipeline = device.createComputePipeline({
    label: 'Simulation pipeline',
    layout: pipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint: 'computeMain'
    }
  })

  const bindGroups: [GPUBindGroup, GPUBindGroup] = [
    device.createBindGroup({
      label: 'Cell renderer bind group A',
      layout: entries.layout,
      entries: [
        ...entries.bindGroup,
        {
          binding: 1,
          resource: entries.storageBindGroup[0].resource
        },
        {
          binding: 2,
          resource: entries.storageBindGroup[1].resource
        }
      ]
    }),
    device.createBindGroup({
      label: 'Cell renderer bind group B',
      layout: entries.layout,
      entries: [
        ...entries.bindGroup,
        {
          binding: 1,
          resource: entries.storageBindGroup[1].resource
        },
        {
          binding: 2,
          resource: entries.storageBindGroup[0].resource
        }
      ]
    })
  ]

  return {
    pipeline: pipeline,
    simulationPipeline: simulationPipeline,
    bindGroups: bindGroups
  }
}

function getUniformEntries(
  device: GPUDevice,
  uniforms: UB[],
  storage: SB[]
): {
  layout: GPUBindGroupLayout
  bindGroup: GPUBindGroupEntry[]
  storageBindGroup: GPUBindGroupEntry[]
} {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  const entries = uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: uniform.visibility || defaultVisibility,
    buffer: { type: uniform.bufferType || ('uniform' as GPUBufferBindingType) },
    resource: { buffer: uniform.buffer }
  }))

  const storageEntries = storage.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: uniform.visibility || defaultVisibility,
    buffer: { type: uniform.bufferType || ('storage' as GPUBufferBindingType) },
    resource: { buffer: uniform.buffer }
  }))

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: [...entries, ...storageEntries].map((entry) => ({
      binding: entry.binding,
      visibility: entry.visibility,
      buffer: entry.buffer
    }))
  })

  return {
    layout: bindGroupLayout,
    bindGroup: entries,
    storageBindGroup: storageEntries
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

interface SB {
  binding?: number
  buffer: GPUBuffer
  bufferType?: GPUBufferBindingType
  visibility?: number
}

interface UB {
  binding?: number
  buffer: GPUBuffer
  bufferType?: GPUBufferBindingType
  visibility?: number
  update?: () => void
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

export function uniformBuffer(device: GPUDevice, options: UBOptions): Required<UB> {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  // Passes the buffer to the update callback
  options.update(buffer)
  return {
    binding: options.binding || 0,
    visibility: options.visibility || defaultVisibility,
    buffer: buffer,
    bufferType: 'uniform',
    update: () => options.update(buffer)
  }
}
