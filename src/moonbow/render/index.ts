import type { GPUCanvas, Pipeline, MoonbowUniforms } from '../'
import { getDepthStencil } from './utils'
import { gpuComputePipeline } from '../'

export function renderPass({
  device,
  context,
  model,
  commandEncoder
}: Pick<GPUCanvas, 'device' | 'context'> & { model: boolean; commandEncoder?: GPUCommandEncoder }) {
  const depthStencil = getDepthStencil(device, context.canvas)

  const cEncoder = commandEncoder || device.createCommandEncoder()

  const passEncoder = cEncoder.beginRenderPass({
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
    const commandBuffer = cEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  return {
    drawPass,
    submitPass,
    passEncoder,
    commandEncoder: cEncoder
  }
}

export type MoonbowRender = ReturnType<typeof renderPass>

const WORKGROUP_SIZE = 8

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
  const computePass = commandEncoder.beginComputePass()

  function drawPass<U extends MoonbowUniforms, S extends MoonbowUniforms>(
    pipeline: ComputePipeline<U, S>,
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
