<script setup lang="ts">
// @ts-ignore
import ConwayShader from '../shaders/conway.wgsl'
import { onMounted } from 'vue'
import { useGPU, gpuCanvas, f32, plane, gpuComputePipeline } from '../moonbow'

function getPlane(device: GPUDevice) {
  const surface = plane(device)
  return {
    buffer: surface.buffer,
    geometry: surface.geometry,
    render: (pass: GPURenderPassEncoder) => surface.set(pass, { rotation: [0.0, 0.0, 0] })
  }
}

onMounted(async () => {
  //Config
  const GRID_SIZE = 100
  const UPDATE_INTERVAL = 30 // Update every 200ms (5 times/sec)

  const { device } = await useGPU()
  const canvas = document.querySelector('canvas')
  const target = gpuCanvas(device, canvas)
  const model = getPlane(device)

  // target.render((pass) => {
  //   model.render(pass)
  // })

  const grid = f32(device, [GRID_SIZE, GRID_SIZE])

  // Create an array representing the active state of each cell.
  // Storage buffers are more flexible and much bigger than uniform buffers
  // but uniform buffers are sometimes prioritised by the GPU so they might be faster depending on the GPU

  const cellstate = pingpong()

  function pingpong() {
    const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

    const stateA = device.createBuffer({
      label: 'Cell - State A',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    const stateB = device.createBuffer({
      label: 'Cell - State B',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    // Set each cell to a random state,
    // then copy the JavaScript array into the storage buffer.
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
    }
    device.queue.writeBuffer(stateA, 0, cellStateArray)

    // Mark every other cell of the second grid as active.
    for (let i = 0; i < cellStateArray.length; i++) {
      cellStateArray[i] = i % 2 // We are saving memory by reusing the same array
    }
    device.queue.writeBuffer(stateB, 0, cellStateArray)

    return {
      a: stateA,
      b: stateB
    }
  }

  const pipeline = gpuComputePipeline(target, {
    shader: ConwayShader,
    wireframe: false,
    uniforms: [
      {
        binding: 0,
        bufferType: 'uniform',
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: grid.buffer
      }
    ],
    storage: [
      {
        binding: 1,
        buffer: cellstate.a,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
        bufferType: 'read-only-storage' // Cell state input buffer
      },
      {
        binding: 2,
        buffer: cellstate.b,
        visibility: GPUShaderStage.COMPUTE,
        bufferType: 'storage' // Cell state output buffer
      }
    ]
  })

  const WORKGROUP_SIZE = 8

  let step = 0 // Track how many simulation steps have been run

  function updateGrid() {
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
          loadOp: 'clear',
          clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
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

  // Schedule updateGrid() to run repeatedly
  setInterval(updateGrid, UPDATE_INTERVAL)
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
