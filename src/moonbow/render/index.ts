import type { GPUCanvas, Pipeline, MoonbowUniforms, MoonbowPipelineOptions } from '../'
import { getDepthStencilAttachment } from './utils'
import { gpuComputePipeline } from '../'

export type MoonbowRender = ReturnType<typeof renderPass>

type ComputePipeline<U extends MoonbowUniforms, S extends MoonbowUniforms> = ReturnType<
  typeof gpuComputePipeline<U, S>
>

interface ComputePass {
  bindGroup: GPUBindGroup
  commandEncoder: GPUCommandEncoder
  simulationPipeline: GPUComputePipeline
  workgroups?: number | [number, number] | [number, number, number]
}

export function computePass({
  bindGroup,
  commandEncoder,
  simulationPipeline,
  workgroups = [1, 1, 1]
}: ComputePass) {
  const computePass = commandEncoder.beginComputePass()

  function drawPass() {
    computePass.setPipeline(simulationPipeline)
    computePass.setBindGroup(0, bindGroup)
  }

  function submitPass() {
    const [x, y, z] = Array.isArray(workgroups)
      ? workgroups.length === 2
        ? [...workgroups, 1]
        : workgroups
      : [workgroups, workgroups, workgroups]
    computePass.dispatchWorkgroups(x, y, z)
    computePass.end()
  }

  return {
    computePass,
    drawPass,
    submitPass
  }
}

export type MoonbowCompute = ReturnType<typeof computePass>

interface PassRender {
  pipeline: GPURenderPipeline
  bindGroup: GPUBindGroup
  context: GPUCanvas['context']
}

export function renderPass({
  target,
  depthStencil
}: {
  target: Pick<GPUCanvas, 'device' | 'context'>
  depthStencil: MoonbowPipelineOptions['depthStencil']
}) {
  const commandEncoder = target.device.createCommandEncoder()

  function drawPass({ pipeline, bindGroup, context }: PassRender) {
    const passEncoder = commandEncoder.beginRenderPass({
      label: 'Moonbow Render Pass',
      depthStencilAttachment: depthStencil
        ? getDepthStencilAttachment(target.device, target.context.canvas)
        : undefined,
      colorAttachments: [
        {
          // @location(0), see fragment shader
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    })

    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup) // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
    return passEncoder
  }

  function submitPass(passEncoder: GPURenderPassEncoder) {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    target.device.queue.submit([commandBuffer])
  }

  return {
    drawPass,
    submitPass,
    commandEncoder
  }
}
