import type { GPUCanvas, Pipeline } from '../'
import { getDepthStencil } from './utils'

export function renderPass({
  device,
  context,
  model,
  commandEncoder
}: Pick<GPUCanvas, 'device' | 'context'> & { model: boolean, commandEncoder: GPUCommandEncoder }) {
  const depthStencil = getDepthStencil(device, context.canvas)

  const passEncoder = commandEncoder.beginRenderPass({
    depthStencilAttachment: model ? depthStencil : undefined,
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

  function drawPass(pipeline: Pick<Pipeline<any, any>, 'bindGroup' | 'pipeline'>) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  return {
    drawPass,
    submitPass,
    passEncoder,
    commandEncoder
  }
}

export type MoonbowRender = ReturnType<typeof renderPass>


const WORKGROUP_SIZE = 8

export function computePass({
  pipeline
  commandEncoder,
  GRID_SIZE,
}: { 
  model: boolean, 
  commandEncoder: GPUCommandEncoder, 
  GRID_SIZE: number, 
  pipeline: Pipeline<any, any> 
}) {
  const computePass = commandEncoder.beginComputePass()
    // Compute work
    computePass.setPipeline(pipeline.simulationPipeline)
    computePass.setBindGroup(0, pipeline.bindGroups[step % 2])

    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE)
    computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
    // DispatchWorkgroups numbers arenot the number of invocations!
    // Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in the shader

    computePass.end()

  return {
    computePass
  }
}

export type MoonbowCompute = ReturnType<typeof computePass>