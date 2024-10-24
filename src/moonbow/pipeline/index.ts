import type { GPUCanvas } from '../target.js'
import { bufferVertexLayout } from '../geometry/utils.js'
import { renderPass } from '../'
import type { GetMemory, MoonbowEncoder, MoonbowUniforms } from '../'
import { getBindGroupLayout, getUniformEntries } from './entries.js'

export interface PipelineOptions {
  shader: string
  computeShader?: string
  wireframe?: boolean
  model?: boolean
}

export type Pipeline = ReturnType<typeof gpuPipeline>

export interface ComputePipeline {
  pipeline: GPURenderPipeline
  simulationPipeline: GPUComputePipeline
  bindGroup: GPUBindGroup
}

export function gpuPipeline<U extends MoonbowUniforms>(
  memory: GetMemory<U>,
  { shader, wireframe = false, model = true }: PipelineOptions
) {
  const { device, format, context } = memory.target
  const uniforms = memory.uniforms ? Object.values(memory.uniforms) : []
  const storage = memory.storage

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
      buffers: model ? bufferVertexLayout() : undefined
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
    depthStencil: model
      ? {
          // this makes sure that faces get rendered in the correct order.
          depthWriteEnabled: true,
          depthCompare: 'less',
          format: 'depth24plus'
        }
      : undefined
  })

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = device.createBindGroup({
    label: 'Cell renderer bind group',
    layout: layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
    entries: entries
  })

  return {
    pipeline,
    bindGroup,
    renderFrame: (callback?: (encoder: MoonbowEncoder) => void) => {
      const encoder = renderPass({ device, context, model })
      encoder.drawPass({ pipeline, bindGroup })
      callback?.({
        commandEncoder: encoder.commandEncoder,
        passEncoder: encoder.passEncoder
      })
      encoder.submitPass()
    }
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
      buffers: bufferVertexLayout()
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

export interface UBI {
  device: GPUDevice
}
