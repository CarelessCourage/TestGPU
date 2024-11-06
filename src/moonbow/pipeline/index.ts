import { renderPass, pipelineCore } from '../'
import type { GetMemory, MoonbowRender, MoonbowUniforms, MoonbowPipelineOptions } from '../'

export interface MemoryEncoder<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends GetMemory<U, S>,
    MoonbowRender {}

type MoonbowFrameCallback<U extends MoonbowUniforms, S extends MoonbowUniforms> = (
  memoryEncoder: MemoryEncoder<U, S>
) => void

export type Pipeline<U extends MoonbowUniforms, S extends MoonbowUniforms> = ReturnType<
  typeof gpuPipeline<U, S>
>

export function gpuPipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>
) {
  const { target, pipeline, layout, uniformEntries } = pipelineCore(memory)

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = target.device.createBindGroup({
    label: 'Cell renderer bind group',
    layout: layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
    entries: uniformEntries
  })

  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    const encoder = renderPass({ target: target, depthStencil: memory.depthStencil })
    encoder.drawPass({ pipeline: pipeline, bindGroup })
    callback?.({ ...memory, ...encoder })
    encoder.submitPass()
  }

  function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return {
    pipeline,
    bindGroup,
    renderFrame,
    loop
  }
}

export function gpuComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: MoonbowPipelineOptions
) {
  const pipe = pipelineCore(memory)

  // Create the compute shader that will process the simulation.
  const simulationShaderModule = pipe.target.device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: options.computeShader || ''
  })

  // Create a compute pipeline that updates the game state.
  const simulationPipeline = pipe.target.device.createComputePipeline({
    label: 'Simulation pipeline',
    layout: pipe.pipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint: 'computeMain'
    }
  })

  const bindGroups = [
    pipe.target.device.createBindGroup({
      label: 'Cell renderer bind group A',
      layout: pipe.layout,
      entries: [
        ...pipe.uniformEntries,
        {
          binding: 1, //@binding(1) in shader
          resource: pipe.storageEntries[0].resource
        },
        {
          binding: 2,
          resource: pipe.storageEntries[1].resource
        }
      ]
    }),
    pipe.target.device.createBindGroup({
      label: 'Cell renderer bind group B',
      layout: pipe.layout,
      entries: [
        ...pipe.uniformEntries,
        {
          binding: 1,
          resource: pipe.storageEntries[1].resource
        },
        {
          binding: 2,
          resource: pipe.storageEntries[0].resource
        }
      ]
    })
  ]

  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    const encoder = renderPass({ target: pipe.target, depthStencil: memory.depthStencil })
    //encoder.drawPass({ pipeline: pipeline, bindGroup })
    callback?.({ ...memory, ...encoder })
    encoder.submitPass()
  }

  function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return {
    pipeline: pipe.pipeline,
    simulationPipeline: simulationPipeline,
    bindGroups: bindGroups,
    renderFrame,
    loop
  }
}

export type ComputePipeline = ReturnType<typeof gpuComputePipeline>
