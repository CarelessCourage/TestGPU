import { renderPass, pipelineCore } from '../'
import type { GetMemory, MoonbowRender, MoonbowUniforms, PipelineOptions } from '../'

export type Pipeline<U extends MoonbowUniforms, S extends MoonbowUniforms> = ReturnType<
  typeof gpuPipeline<U, S>
>

export function gpuPipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: PipelineOptions
) {
  const { target, pipeline, layout, uniformEntries, model } = pipelineCore(memory, options)

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = target.device.createBindGroup({
    label: 'Cell renderer bind group',
    layout: layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
    entries: uniformEntries
  })

  return {
    pipeline: pipeline,
    bindGroup,
    renderFrame: (callback?: (encoder: MoonbowRender) => void) => {
      const encoder = renderPass({ ...target, model: model })
      encoder.drawPass({ pipeline: pipeline, bindGroup })
      callback?.(encoder)
      encoder.submitPass()
    }
  }
}

export function gpuComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: PipelineOptions
) {
  const pipe = pipelineCore(memory, options)

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

  return {
    pipeline: pipe.pipeline,
    simulationPipeline: simulationPipeline,
    bindGroups: bindGroups,
    renderFrame: (callback?: (encoder: MoonbowRender) => void) => {
      const encoder = renderPass({ ...pipe.target, model: pipe.model })
      //encoder.drawPass({ pipeline, bindGroup })
      callback?.(encoder)
      encoder.submitPass()
    }
  }
}

export type ComputePipeline = ReturnType<typeof gpuComputePipeline>
