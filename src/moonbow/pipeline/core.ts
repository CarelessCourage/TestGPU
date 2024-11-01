import { bufferVertexLayout } from '../geometry/utils.js'
import { getBindGroupLayout, getUniformEntries } from './entries.js'
import type { GetMemory, MoonbowUniforms } from '../'

export interface PipelineOptions {
  shader: string
  computeShader?: string
  wireframe?: boolean
  model?: boolean
  depthStencil?: boolean | GPUDepthStencilState
}

function memoryLayout<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>
) {
  const target = memory.target
  const uniforms = memory.uniforms ? Object.values(memory.uniforms) : []
  const storage = memory.storage ? Object.values(memory.storage) : []

  const uniformEntries = getUniformEntries({ device: target.device, uniforms })
  const storageEntries = getUniformEntries({ device: target.device, uniforms: storage || [] })
  const layout = getBindGroupLayout(target.device, [...uniformEntries, ...storageEntries])

  return { target, layout, uniformEntries, storageEntries }
}

export function pipelineCore<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  { shader, wireframe = false, model = true, depthStencil }: PipelineOptions
) {
  const { target, layout, uniformEntries, storageEntries } = memoryLayout(memory)

  const pipelineLayout = target.device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [layout]
  })

  const shaderModule = target.device.createShaderModule({
    label: 'Shader module',
    code: shader
  })

  const pipeline = target.device.createRenderPipeline({
    label: 'Render pipeline',
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: model ? bufferVertexLayout() : undefined
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format: target.format }]
    },
    primitive: {
      topology: wireframe ? 'line-list' : 'triangle-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    },
    depthStencil: getStencil(depthStencil)
  })

  return {
    model,
    target,
    layout,
    pipeline,
    pipelineLayout,
    uniformEntries,
    storageEntries
  }
}

function getStencil(depthStencil?: boolean | GPUDepthStencilState) {
  const defaultStencil: GPUDepthStencilState = {
    // this makes sure that faces get rendered in the correct order.
    depthWriteEnabled: true,
    depthCompare: 'less',
    format: 'depth24plus'
  }

  if (depthStencil === true) return defaultStencil
  if (depthStencil === false) return undefined
  return depthStencil
}
