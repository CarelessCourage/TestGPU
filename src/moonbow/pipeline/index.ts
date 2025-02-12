import { getRenderer, computePass, pipelineCore } from '../'
import type {
  GetMemory,
  MoonbowBuffers,
  MoonbowPipelineOptions,
  ComputePass,
  PipelineCore
} from '../'
import { isFunc } from '../utils/index'

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

  const actions = {
    compute: (props: ComputeProps) =>
      makeCommands<U, S, B>(
        { pipe, memory },
        computeEncoder(props, {
          pipe,
          bindGroups: memory.bindGroups(pipe.bindGroup),
          simulationPipeline
        })
      ),

    ...makeCommands({ pipe, memory })
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

function makeCommands<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(
  props: {
    pipe: PipelineCore
    memory: GetMemory<U, S, B>
  },
  passedCommandEncoder?: GPUCommandEncoder
) {
  const bindGroups = props.memory.bindGroups(props.pipe.bindGroup)

  function draw(passedBindGroup: PassedBindGroup) {
    const { bindGroup } = isFunc(passedBindGroup)
      ? passedBindGroup({ bindGroups })
      : passedBindGroup

    const encoder = getRenderer({
      target: props.pipe.target,
      depthStencil: props.memory.depthStencil,
      commandEncoder: passedCommandEncoder
    })

    const { renderPass } = encoder.initPass()

    encoder.drawPass({
      pipeline: props.pipe.pipeline,
      passEncoder: renderPass,
      bindGroup: bindGroup
    })

    function submit() {
      encoder.submitPass(renderPass)
    }

    function frame(callback: (props: MoonbowCallback<U, S, B>) => void) {
      callback({
        ...props.memory,
        commandEncoder: encoder.commandEncoder,
        renderPass: renderPass
      })
      submit()
    }

    return {
      ...props.pipe,
      submit,
      frame
    }
  }

  return {
    draw: (passedBindGroup: PassedBindGroup) => draw(passedBindGroup),
    submit: (bindGroup?: GPUBindGroup) =>
      draw({ bindGroup: bindGroup ? bindGroup : bindGroups[0] }).submit(),
    frame: (callback: (props: MoonbowCallback<U, S, B>) => void) => {
      draw({ bindGroup: bindGroups[0] }).frame(callback)
    }
  }
}

function computeEncoder(
  props: ComputeProps,
  {
    pipe,
    bindGroups,
    simulationPipeline
  }: {
    pipe: PipelineCore
    bindGroups: GPUBindGroup[]
    simulationPipeline: GPUComputePipeline | null
  }
) {
  if (simulationPipeline === null) throw new Error('No compute shader provided')
  const options = isFunc(props) ? props({ bindGroups }) : props

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
  return commandEncoder
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
