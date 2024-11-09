import type { GPUCanvas, Pipeline, MoonbowUniforms, MoonbowPipelineOptions } from '../'
import { getDepthStencilAttachment } from './utils'
import { gpuComputePipeline } from '../'

export function renderPass({
  target,
  depthStencil
}: {
  target: Pick<GPUCanvas, 'device' | 'context'>
  depthStencil: MoonbowPipelineOptions['depthStencil']
}) {
  const commandEncoder = target.device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
    label: 'Moonbow Render Pass',
    depthStencilAttachment: depthStencil
      ? getDepthStencilAttachment(target.device, target.context.canvas)
      : undefined,
    colorAttachments: [
      {
        // @location(0), see fragment shader
        view: target.context.getCurrentTexture().createView(),
        clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  })

  function drawPass(pipeline: Pick<Pipeline<any, any>, 'bindGroup' | 'pipeline'>) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    target.device.queue.submit([commandBuffer])
  }

  return {
    drawPass,
    submitPass,
    passEncoder,
    commandEncoder
  }
}

export type MoonbowRender = ReturnType<typeof renderPass>

type ComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms> = ReturnType<
  typeof gpuComputePipeline<U, S>
>

export function computePass({
  commandEncoder,
  GRID_SIZE
}: {
  commandEncoder: GPUCommandEncoder
  GRID_SIZE: number
}) {
  const WORKGROUP_SIZE = 8
  const computePass = commandEncoder.beginComputePass()

  function drawPass<U extends MoonbowUniforms, S extends MoonbowUniforms>(
    pipeline: Pick<ComputePipeline<U, S>, 'simulationPipeline' | 'bindGroups'>,
    step: number
  ) {
    computePass.setPipeline(pipeline.simulationPipeline)
    computePass.setBindGroup(0, pipeline.bindGroups[step % 2])
  }

  function submitPass() {
    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE)
    computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
    computePass.end()
  }

  return {
    computePass,
    drawPass,
    submitPass
  }
}

export type MoonbowCompute = ReturnType<typeof computePass>

function updateGrid<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  pipeline: ComputePipeline<U, S>
) {
  const encoder = pipeline.target.device.createCommandEncoder()

  // runCompute(encoder)

  interface PassRender {
    pipeline: GPURenderPipeline
    bindGroup: GPUBindGroup
  }

  function passRender({ pipeline, bindGroup }: PassRender) {
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup) // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
  }

  function submitPass(passEncoder: GPURenderPassEncoder) {
    passEncoder.end()
    const commandBuffer = encoder.finish()
    pipeline.target.device.queue.submit([commandBuffer])
  }

  const passEncoder = encoder.beginRenderPass({
    label: 'Moonbow Render Pass',
    depthStencilAttachment: undefined,
    colorAttachments: [
      {
        // @location(0), see fragment shader
        view: pipeline.target.context.getCurrentTexture().createView(),
        clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  })

  passRender({
    pipeline: pipeline.pipeline,
    bindGroup: pipeline.bindGroups[step % 2]
  })

  // cellPlane.update(passEncoder)

  submitPass(passEncoder)
}
