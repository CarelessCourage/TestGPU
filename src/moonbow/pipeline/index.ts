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
  memory: GetMemory<U, S>,
  options: Partial<MoonbowPipelineOptions>
) {
  const pCore = pipelineCore({ ...memory, ...options })
  const bindGroup = pCore.bindGroup()

  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    const encoder = renderPass({ pipeline: pCore, depthStencil: memory.depthStencil })
    const initPass = encoder.initPass()
    encoder.drawPass({
      bindGroup,
      passEncoder: initPass
    })
    callback?.({ ...memory, ...encoder })
    encoder.submitPass(initPass)
  }

  function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return {
    pipeline: pCore.pipeline,
    bindGroup,
    renderFrame,
    loop
  }
}

export function gpuComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: Partial<MoonbowPipelineOptions>
) {
  const pipe = pipelineCore({ ...memory, ...options })

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
    pipe.bindGroup(),
    pipe.bindGroup(({ uniformEntries, storageEntries }) => [
      ...uniformEntries,
      {
        binding: 1,
        resource: storageEntries[1].resource
      },
      {
        binding: 2,
        resource: storageEntries[0].resource
      }
    ])
  ]

  function renderFrameCore(callback?: MoonbowFrameCallback<U, S>) {
    const encoder = renderPass({ pipeline: pipe, depthStencil: memory.depthStencil })
    //encoder.drawPass({ pipeline: pipeline, bindGroup })
    callback?.({ ...memory, ...encoder })
  }

  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    const encoder = renderPass({ pipeline: pipe, depthStencil: memory.depthStencil })
    const initPass = encoder.initPass()
    //encoder.drawPass({ pipeline: pipeline, bindGroup })
    callback?.({ ...memory, ...encoder })
    encoder.submitPass(initPass)
  }

  function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return {
    core: pipe,
    simulationPipeline,
    renderFrame,
    bindGroups,
    loop
  }
}

export type ComputePipeline = ReturnType<typeof gpuComputePipeline>
