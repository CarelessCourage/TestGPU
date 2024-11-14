import { getRenderer, computePass, pipelineCore } from '../'
import type {
  GetMemory,
  MoonbowRender,
  MoonbowUniforms,
  MoonbowPipelineOptions,
  ComputePass
} from '../'

interface MemoryEncoder<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends GetMemory<U, S>,
    MoonbowRender {}

type MoonbowFrameCallback<U extends MoonbowUniforms, S extends MoonbowUniforms> = (
  memoryEncoder: MemoryEncoder<U, S>
) => void

export type Pipeline<U extends MoonbowUniforms, S extends MoonbowUniforms> = ReturnType<
  typeof gpuPipeline<U, S>
>

export interface MoonbowCallback<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends GetMemory<U, S> {
  commandEncoder: GPUCommandEncoder
  renderPass: GPURenderPassEncoder
}

export function gpuPipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: Partial<MoonbowPipelineOptions>
) {
  const pCore = pipelineCore({ ...memory, ...options })
  const bindGroup = pCore.bindGroup()

  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    const commandEncoder = pCore.target.device.createCommandEncoder()

    const encoder = getRenderer({
      pipeline: pCore,
      depthStencil: memory.depthStencil,
      commandEncoder
    })
    const { renderPass } = encoder.initPass()
    encoder.drawPass({
      bindGroup,
      passEncoder: renderPass
    })
    callback?.({ ...memory, ...encoder })
    encoder.submitPass(renderPass)
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

  function test() {
    const commandEncoder = pipe.target.device.createCommandEncoder({
      label: 'Moonbow Command Encoder'
    })

    function render() {
      const encoder = getRenderer({ pipeline: pipe, depthStencil: false, commandEncoder }) //memory.depthStencil

      function draw(bindGroup: GPUBindGroup) {
        const initP = encoder.initPass()
        encoder.drawPass({
          passEncoder: initP.renderPass,
          bindGroup: bindGroup
        })

        return {
          submit: () => encoder.submitPass(initP.renderPass),
          frame: (callback: (props: MoonbowCallback<U, S>) => void) => {
            callback({
              ...memory,
              commandEncoder: encoder.commandEncoder,
              renderPass: initP.renderPass
            })
            encoder.submitPass(initP.renderPass)
          }
        }
      }

      return {
        draw: draw,
        submit: (bindGroup?: GPUBindGroup) => draw(bindGroup ? bindGroup : bindGroups[0]).submit(),
        frame: (callback: (props: MoonbowCallback<U, S>) => void) => {
          draw(bindGroups[0]).frame(callback)
        }
      }
    }

    function compute(props: Partial<Pick<ComputePass, 'workgroups' | 'bindGroup'>>) {
      const computeEncoder = computePass({
        commandEncoder,
        workgroups: props.workgroups,
        simulationPipeline: simulationPipeline,
        bindGroup: props.bindGroup || bindGroups[0]
      })

      computeEncoder.draw().submit()
      return render()
    }

    return {
      compute: compute,
      render: render
    }
  }

  // function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
  //   const encoder = getRenderer({
  //     pipeline: pipe,
  //     depthStencil: memory.depthStencil,
  //     commandEncoder
  //   })
  //   const { renderPass } = encoder.initPass()
  //   //encoder.drawPass({ pipeline: pipeline, bindGroup })
  //   callback?.({ ...memory, ...encoder })
  //   encoder.submitPass(renderPass)
  // }

  // function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
  //   setInterval(() => renderFrame(callback), interval)
  // }

  return {
    core: pipe,
    simulationPipeline,
    bindGroups,
    test
  }
}

export type ComputePipeline = ReturnType<typeof gpuComputePipeline>
