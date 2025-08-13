import { bufferVertexLayout } from '../geometry/utils'
import { getStencil } from '../render/utils'
import { getBindGroupLayout, getUniformEntries } from './entries'
import type { GetMemory, MoonbowBuffers } from '../'

function memoryLayout<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(memory: GetMemory<U, S, B>) {
  const target = memory.target
  const uniforms = memory.uniforms ? Object.values(memory.uniforms) : []
  const storage = memory.storage ? Object.values(memory.storage) : []

  const uniformEntries = getUniformEntries({ device: target.device, uniforms })
  const storageEntries = getUniformEntries({ device: target.device, uniforms: storage || [] })
  const layout = getBindGroupLayout(target.device, [...uniformEntries, ...storageEntries])

  return { target, layout, uniformEntries, storageEntries }
}

export function pipelineCore<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(memory: GetMemory<U, S, B>) {
  const memLay = memoryLayout(memory)

  const pipelineLayout = memLay.target.device.createPipelineLayout({
    label: 'Moonbow Pipeline Layout',
    bindGroupLayouts: [memLay.layout]
  })

  const shaderModule = memLay.target.device.createShaderModule({
    label: 'Moonbow Shader module',
    code: memory.shader || ''
  })

  const pipeline = memLay.target.device.createRenderPipeline({
    label: 'Moonbow Render pipeline',
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: 'vertexMain',
      buffers: memory.model ? bufferVertexLayout() : undefined
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragmentMain',
      targets: [{ format: memLay.target.format }]
    },
    depthStencil: getStencil(memory.depthStencil),
    primitive: {
      topology: memory.wireframe ? 'line-list' : 'triangle-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    }
  })

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup: BindGroup<U, S, B> = (
    callback?: ({ uniformEntries, storageEntries }: typeof memLay) => Iterable<GPUBindGroupEntry>
  ) => {
    return memLay.target.device.createBindGroup({
      label: 'Moonbow bindgroup',
      layout: memLay.layout,
      entries: callback ? callback(memLay) : [...memLay.uniformEntries, ...memLay.storageEntries]
    })
  }

  return {
    pipeline,
    pipelineLayout,
    model: memory.model,
    target: memLay.target,
    layout: memLay.layout,
    uniformEntries: memLay.uniformEntries,
    storageEntries: memLay.storageEntries,
    bindGroup,
    // No explicit destroy on pipeline objects in WebGPU spec yet; rely on GC.
    // Expose a placeholder for symmetry allowing higher-level dispose patterns.
    dispose: () => {
      // Future: release resources like render bundles, custom caches.
    }
  }
}

export type BindGroup<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> = (
  callback?: ({
    uniformEntries,
    storageEntries
  }: ReturnType<typeof memoryLayout<U, S, B>>) => Iterable<GPUBindGroupEntry>
) => GPUBindGroup

export type BindGroups<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> = (bindGroup: BindGroup<U, S, B>) => B | [GPUBindGroup]

export type PipelineCore = ReturnType<typeof pipelineCore>
