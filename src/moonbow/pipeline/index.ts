import { getRenderer, computePass, pipelineCore } from '../'
import type {
  GetMemory,
  MoonbowRender,
  MoonbowUniforms,
  MoonbowPipelineOptions,
  ComputePass,
  PipelineCore
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

export function gpuComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  memory: GetMemory<U, S>,
  options: Partial<MoonbowPipelineOptions>
) {
  const pipe = pipelineCore({ ...memory, ...options })

  // Create a compute pipeline that updates the game state.
  const simulationPipeline = options.computeShader ? getSimulationPipeline({ pipe, options }) : null
  const bindGroups = memory.bindGroups(pipe.bindGroup)

  function getCommandEncoder() {
    return pipe.target.device.createCommandEncoder({
      label: 'Moonbow Command Encoder'
    })
  }

  function render(passedCommandEncoder?: GPUCommandEncoder) {
    const commandEncoder = passedCommandEncoder || getCommandEncoder()
    const encoder = getRenderer({ pipeline: pipe, depthStencil: false, commandEncoder }) //memory.depthStencil

    type DrawProps = { bindGroup: GPUBindGroup }
    type DrawFunction = (props: { bindGroups: GPUBindGroup[] }) => DrawProps

    function draw(passedBindGroup: DrawProps | DrawFunction) {
      const { bindGroup } =
        typeof passedBindGroup === 'function' ? passedBindGroup({ bindGroups }) : passedBindGroup

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
      submit: (bindGroup?: GPUBindGroup) =>
        draw({ bindGroup: bindGroup ? bindGroup : bindGroups[0] }).submit(),
      frame: (callback: (props: MoonbowCallback<U, S>) => void) => {
        draw({ bindGroup: bindGroups[0] }).frame(callback)
      }
    }
  }

  type ComputeProps = Partial<Pick<ComputePass, 'workgroups' | 'bindGroup'>>
  type ComputeFunction = (props: { bindGroups: GPUBindGroup[] }) => ComputeProps

  function compute(props: ComputeProps | ComputeFunction) {
    if (simulationPipeline === null) throw new Error('No compute shader provided')
    const options = typeof props === 'function' ? props({ bindGroups }) : props

    const commandEncoder = getCommandEncoder()
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

export type ComputePipeline = ReturnType<typeof gpuComputePipeline>
