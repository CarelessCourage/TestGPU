import { bufferVertexLayout } from '../geometry/utils'
import { getStencil } from '../render/utils'
import { getBindGroupLayout, getUniformEntries } from './entries'
import type { GetMemory, MoonbowUniforms } from '../'

export interface PipelineOptions {
  shader: string
  computeShader?: string
  wireframe?: boolean
  model?: boolean
  depthStencil?: boolean | GPUDepthStencilState
}

function memoryLayout<U extends MoonbowUniforms, S extends MoonbowUniforms>({
  memory
}: GetMemory<U, S>) {
  const target = memory.target
  const uniforms = memory.uniforms ? Object.values(memory.uniforms) : []
  const storage = memory.storage ? Object.values(memory.storage) : []

  const uniformEntries = getUniformEntries({ device: target.device, uniforms })
  const storageEntries = getUniformEntries({ device: target.device, uniforms: storage || [] })
  const layout = getBindGroupLayout(target.device, [...uniformEntries, ...storageEntries])

  return { target, layout, uniformEntries, storageEntries }
}

export function pipelineCore<U extends MoonbowUniforms, S extends MoonbowUniforms>({
  memory,
  options
}: GetMemory<U, S>) {
  const { target, layout, uniformEntries, storageEntries } = memoryLayout(memory)

  const pipelineLayout = target.device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [layout]
  })

  const shaderModule = target.device.createShaderModule({
    label: 'Shader module',
    code: options.shader || ''
  })

  const pipeline = target.device.createRenderPipeline({
    label: 'Moonbow Render pipeline',
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: options.model ? bufferVertexLayout() : undefined
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format: target.format }]
    },
    depthStencil: getStencil(options.depthStencil),
    primitive: {
      topology: options.wireframe ? 'line-list' : 'triangle-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    }
  })

  return {
    model: options.model,
    target,
    layout,
    pipeline,
    pipelineLayout,
    uniformEntries,
    storageEntries
  }
}
