const WORKGROUP_SIZE = 8

let step = 0 // Track how many simulation steps have been run

function updateGrid({
  device,
  pipeline,
  GRID_SIZE,
  target,
  model
}: {
  device: GPUDevice
  pipeline: any
  GRID_SIZE: number
  target: any
  model: any
}) {
  const encoder = device.createCommandEncoder()
  const computePass = encoder.beginComputePass()

  // Compute work
  computePass.setPipeline(pipeline.simulationPipeline)
  computePass.setBindGroup(0, pipeline.bindGroups[step % 2])

  const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE)
  computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
  // DispatchWorkgroups numbers arenot the number of invocations!
  // Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in the shader

  computePass.end()

  step++

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        //@location(0), see fragment shader
        view: target.context.getCurrentTexture().createView(),
        clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  })

  pass.setPipeline(pipeline.pipeline)

  pass.setVertexBuffer(0, model.buffer.vertices)
  pass.setVertexBuffer(1, model.buffer.normals)
  pass.setVertexBuffer(2, model.buffer.uvs)

  pass.setBindGroup(0, pipeline.bindGroups[step % 2]) // Makes sure the bind group with all the uniform stuff is actually being used in the pass
  // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
  // You're saying that each @binding that's part of @group(0) uses the resources in this bind group.

  // Draw Geometry
  pass.setIndexBuffer(model.buffer.indices, 'uint16')
  pass.drawIndexed(
    model.buffer.indicesCount,
    GRID_SIZE * GRID_SIZE, // 16 instances
    0,
    0,
    0
  )

  pass.end()

  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}
