<script setup lang="ts">
// @ts-ignore
import ConwayShader from '../shaders/conway.wgsl'
// @ts-ignore
import ConwayCompute from '../shaders/conwayCompute.wgsl'
import { onMounted } from 'vue'
import { useGPU, plane, gpuComputePipeline, getMemory, renderPass, computePass } from '../moonbow'
import { cellPong } from '../moonbow/buffers/cellPong'
import { updateGrid } from './test'

function getPlane(device: GPUDevice) {
  const surface = plane(device)
  return {
    buffer: surface.buffer,
    geometry: surface.geometry,
    render: (pass: GPURenderPassEncoder) => surface.set(pass, { rotation: [0.0, 0.0, 0] })
  }
}

onMounted(async () => {
  const GRID_SIZE = 100
  const UPDATE_INTERVAL = 30 // Update every 200ms (5 times/sec)

  const { device } = await useGPU()

  const model = getPlane(device)
  const cellstate = cellPong(device, GRID_SIZE)

  const memory = await getMemory({
    device,
    canvas: document.querySelector('canvas'),
    storage: ({ target }) => ({
      read: cellstate.storage[0],
      write: cellstate.storage[1]
    }),
    uniforms: ({ target }) => ({
      cellPong: cellstate.uniform
    })
  })

  const pipeline = gpuComputePipeline(memory, {
    shader: ConwayShader,
    computeShader: ConwayCompute,
    wireframe: false,
    model: true
  })

  let step = 0 // Track how many simulation steps have been run

  function runCompute(commandEncoder: GPUCommandEncoder) {
    const computeEncoder = computePass({
      GRID_SIZE,
      commandEncoder
    })

    computeEncoder.drawPass(pipeline, step)
    computeEncoder.submitPass()

    step++
  }

  function updateGrid2() {
    const commandEncoder = device.createCommandEncoder()

    runCompute(commandEncoder)

    const encoder = renderPass({
      device,
      context: memory.target.context,
      commandEncoder,
      model: true
    })

    const pass = encoder.passEncoder

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

    const commandBuffer = encoder.commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  // Schedule updateGrid() to run repeatedly
  setInterval(
    () =>
      updateGrid({
        device,
        pipeline,
        GRID_SIZE,
        target: memory.target,
        model
      }),
    UPDATE_INTERVAL
  )
})
</script>

<template>
  <div class="meta">
    <div class="title">
      <h1>Conway's</h1>
      <h1>game of life</h1>
    </div>
    <p>
      Less than two live neighbors kills the cell, <span class="dim">as if by underpopulation</span>
    </p>
    <p>
      More than three live neighbors kills a cell, <span class="dim">as if by overpopulation</span>
    </p>
    <p>Three live neighbors becomes a live cell, <span class="dim">as if by reproduction</span></p>
  </div>
  <div class="canvas-wrapper">
    <canvas width="512" height="512"></canvas>
  </div>
  <h1 class="display">WebGPU</h1>
</template>

<style scoped>
.title {
  padding-right: 7em;
}

.title h1:nth-of-type(1) {
  font-size: 2.8em;
  opacity: 0.5;
  line-height: 1;
}

p span.dim {
  opacity: 0.3;
}

div.meta {
  position: absolute;
  --padding: 5vw;
  display: grid;
  grid-template-columns: auto repeat(3, 1fr);
  gap: calc(var(--padding) / 2);
  padding-left: var(--padding);
  padding-right: var(--padding);
  top: 10vh;
}
</style>
