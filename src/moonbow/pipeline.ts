import type { GPUCanvas } from './target.js'
import { bufferLayout } from './geometry/utils.js'
interface PipelineOptions {
  uniforms: UB[]
  storage?: [UB, UB]
  shader: string
  computeShader?: string
  wireframe?: boolean
}

export type Pipeline = ReturnType<typeof gpuPipeline>

export interface ComputePipeline {
  pipeline: GPURenderPipeline
  simulationPipeline: GPUComputePipeline
  bindGroup: GPUBindGroup
}

export function gpuPipeline(
  { device, format }: GPUCanvas,
  { uniforms, shader, wireframe = false }: PipelineOptions
) {
  const entries = getUniformEntries({ device, uniforms })
  const layout = getBindGroupLayout(device, entries)

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: shader
  })

  const pipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: device.createPipelineLayout({
      bindGroupLayouts: [layout]
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
    layout: layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
    entries: entries
  })

  return {
    pipeline: pipeline,
    bindGroup: bindGroup
  }
}

export function gpuComputePipeline(
  { device, format }: GPUCanvas,
  { uniforms, shader, computeShader, storage, wireframe = false }: PipelineOptions
) {
  const entries = getUniformEntries({ device, uniforms })
  const storageEntries = getUniformEntries({ device, uniforms: storage || [] })
  const layout = getBindGroupLayout(device, [...entries, ...storageEntries])

  const pipelineLayout = device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [layout]
  })

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: shader
  })

  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: pipelineLayout,
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
      topology: 'line-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    }
  })

  // Create the compute shader that will process the simulation.
  const simulationShaderModule = device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: computeShader || ''
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

  const bindGroups = [
    device.createBindGroup({
      label: 'Cell renderer bind group A',
      layout: layout,
      entries: [
        ...entries,
        {
          binding: 1, //@binding(1) in shader
          resource: storageEntries[0].resource
        },
        {
          binding: 2,
          resource: storageEntries[1].resource
        }
      ]
    }),
    device.createBindGroup({
      label: 'Cell renderer bind group B',
      layout: layout,
      entries: [
        ...entries,
        {
          binding: 1,
          resource: storageEntries[1].resource
        },
        {
          binding: 2,
          resource: storageEntries[0].resource
        }
      ]
    })
  ]

  return {
    pipeline: cellPipeline,
    simulationPipeline: simulationPipeline,
    bindGroups: bindGroups
  }
}

type UniformEntries = ReturnType<typeof getUniformEntries>

function getUniformEntries(props: { device: GPUDevice; uniforms: UB[] }) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  return props.uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: uniform.visibility || defaultVisibility,
    buffer: { type: uniform.bufferType || ('uniform' as GPUBufferBindingType) },
    resource: { buffer: uniform.buffer }
  }))
}

function getBindGroupLayout(device: GPUDevice, entries: UniformEntries) {
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: entries.map((entry) => ({
      binding: entry.binding,
      visibility: entry.visibility,
      buffer: entry.buffer
    }))
  })
  return bindGroupLayout
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
  bufferType?: GPUBufferBindingType
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
  usage?: GPUBufferUsageFlags
  update: (buffer: GPUBuffer) => void
}

export function uniformBuffer(device: GPUDevice, options: UBOptions): UB {
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

export function storageBuffer(device: GPUDevice, options: UBOptions): UB {
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
