import { getRenderer, computePass, pipelineCore } from '../'
import type {
  GetMemory,
  MoonbowBuffers,
  MoonbowPipelineOptions,
  ComputePass,
  PipelineCore
} from '../'

export interface MoonbowCallback<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> extends GetMemory<U, S, B> {
  commandEncoder: GPUCommandEncoder
  renderPass: GPURenderPassEncoder
}

type DrawProps = { bindGroup: GPUBindGroup }
type DrawFunction = (props: { bindGroups: GPUBindGroup[] }) => DrawProps
type PassedBindGroup = DrawProps | DrawFunction

type ComputeObjectProps = Partial<Pick<ComputePass, 'workgroups' | 'bindGroup'>>
type ComputeFunctionProp = (props: { bindGroups: GPUBindGroup[] }) => ComputeObjectProps
type ComputeProps = ComputeObjectProps | ComputeFunctionProp

export function gpuPipeline<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(memory: GetMemory<U, S, B>, options?: Partial<MoonbowPipelineOptions>) {
  const pipe = pipelineCore({ ...memory, ...options })

  // Create a compute pipeline that updates the game state.
  const simulationPipeline = options?.computeShader
    ? getSimulationPipeline({ pipe, options })
    : null
  const bindGroups = memory.bindGroups(pipe.bindGroup)

  function render(passedCommandEncoder?: GPUCommandEncoder) {
    return {
      draw: (passedBindGroup: PassedBindGroup) => draw(passedBindGroup, passedCommandEncoder),
      submit: (bindGroup?: GPUBindGroup) =>
        draw({ bindGroup: bindGroup ? bindGroup : bindGroups[0] }, passedCommandEncoder).submit(),
      frame: (callback: (props: MoonbowCallback<U, S, B>) => void) => {
        draw({ bindGroup: bindGroups[0] }, passedCommandEncoder).frame(callback)
      }
    }
  }

  function draw(passedBindGroup: PassedBindGroup, passedCommandEncoder?: GPUCommandEncoder) {
    const encoder = getRenderer({
      target: pipe.target,
      depthStencil: memory.depthStencil,
      commandEncoder: passedCommandEncoder
    })
    const { bindGroup } =
      typeof passedBindGroup === 'function' ? passedBindGroup({ bindGroups }) : passedBindGroup
    const initP = encoder.initPass()

    encoder.drawPass({
      pipeline: pipe.pipeline,
      passEncoder: initP.renderPass,
      bindGroup: bindGroup
    })

    return {
      ...pipe,
      submit: () => encoder.submitPass(initP.renderPass),
      frame: (callback: (props: MoonbowCallback<U, S, B>) => void) => {
        callback({
          ...memory,
          commandEncoder: encoder.commandEncoder,
          renderPass: initP.renderPass
        })
        encoder.submitPass(initP.renderPass)
      }
    }
  }

  function compute(props: ComputeProps) {
    if (simulationPipeline === null) throw new Error('No compute shader provided')
    const options = typeof props === 'function' ? props({ bindGroups }) : props

    const commandEncoder = pipe.target.device.createCommandEncoder({
      label: 'Moonbow Command Encoder'
    })
    const computeEncoder = computePass({
      commandEncoder,
      workgroups: options.workgroups,
      simulationPipeline: simulationPipeline,
      bindGroup: options.bindGroup || bindGroups[0]
    })

    computeEncoder.draw().submit()
    return render(commandEncoder)
  }

  const actions = {
    compute,
    ...render()
  }

  function loop(callback: (props: typeof actions) => void, interval = 1000 / 60) {
    setInterval(() => callback(actions), interval)
  }

  return {
    core: pipe,
    simulationPipeline,
    loop,
    ...actions
  }
}

function getSimulationPipeline(props: {
  pipe: PipelineCore
  options: Partial<MoonbowPipelineOptions>
}) {
  const simulationShaderModule = props.pipe.target.device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: props.options.computeShader || ''
  })

  // Create a compute pipeline that updates the game state.
  return props.pipe.target.device.createComputePipeline({
    label: 'Simulation pipeline',
    layout: props.pipe.pipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint: 'computeMain'
    }
  })
}

export type MoonbowPipeline = ReturnType<typeof gpuPipeline>
