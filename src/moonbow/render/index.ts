import type { MoonbowPipelineOptions, PipelineCore } from '../'
import { getDepthStencilAttachment } from './utils'

export type MoonbowRender = ReturnType<typeof getRenderer>

export interface ComputePass {
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

  function draw() {
    computePass.setPipeline(simulationPipeline)
    computePass.setBindGroup(0, bindGroup)
    return {
      submit,
      frame: (callback: () => void) => {
        callback()
        submit()
      }
    }
  }

  function submit() {
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
    draw,
    submit: () => draw().submit(),
    frame: (callback: () => void) => {
      draw().frame(callback)
    }
  }
}

export type MoonbowCompute = ReturnType<typeof computePass>

interface PassRender {
  bindGroup: GPUBindGroup
  passEncoder: GPURenderPassEncoder
}

export function getRenderer({
  pipeline,
  depthStencil,
  commandEncoder
}: {
  pipeline: Pick<PipelineCore, 'pipeline' | 'target'>
  depthStencil: MoonbowPipelineOptions['depthStencil']
  commandEncoder: GPUCommandEncoder
}) {
  function initPass() {
    const renderPass = commandEncoder.beginRenderPass({
      label: 'Moonbow Render Pass',
      depthStencilAttachment: depthStencil
        ? getDepthStencilAttachment(pipeline.target.device, pipeline.target.context.canvas)
        : undefined,
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
    return {
      renderPass,
      submitPass,
      drawPass
    }
  }

  function drawPass({ bindGroup, passEncoder }: PassRender) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, bindGroup) // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
    return passEncoder
  }

  function submitPass(passEncoder: GPURenderPassEncoder) {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    pipeline.target.device.queue.submit([commandBuffer])
  }

  return {
    initPass,
    drawPass,
    submitPass,
    commandEncoder
  }
}
