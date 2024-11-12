<script setup lang="ts">
// @ts-ignore
import ConwayShader from '../shaders/conway.wgsl'
// @ts-ignore
import ConwayCompute from '../shaders/conwayCompute.wgsl'
import { onMounted } from 'vue'
import {
  useGPU,
  getCellPlane,
  gpuComputePipeline,
  getMemory,
  computePass,
  renderPass
} from '../moonbow'
import { getCellPong } from '../moonbow/buffers/cellPong'

onMounted(async () => {
  const { device } = await useGPU()

  const GRID_SIZE = 100
  const cellPlane = getCellPlane(device, GRID_SIZE)
  const cellState = getCellPong(device, GRID_SIZE)

  const memory = await getMemory({
    device,
    canvas: document.querySelector('canvas'),
    uniforms: () => ({ cellPong: cellState.uniform }),
    storage: () => ({
      read: cellState.storage[0],
      write: cellState.storage[1]
    })
  })

  const pipeline = gpuComputePipeline(memory, {
    shader: ConwayShader,
    computeShader: ConwayCompute,
    wireframe: true
  })

  let step = 0 // Track how many simulation steps have been run
  function runCompute(commandEncoder: GPUCommandEncoder) {
    const WORKGROUP_SIZE = 8
    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE)

    const computeEncoder = computePass({
      commandEncoder,
      workgroups: [workgroupCount, workgroupCount, 1],
      simulationPipeline: pipeline.simulationPipeline,
      bindGroup: pipeline.bindGroups[step % 2]
    })

    computeEncoder.drawPass()
    computeEncoder.submitPass()

    step++
  }

  function updateGrid() {
    const lol = renderPass({
      target: pipeline.target,
      depthStencil: false
    })

    runCompute(lol.commandEncoder)

    const passEncoder = lol.drawPass({
      pipeline: pipeline.pipeline,
      context: pipeline.target.context,
      bindGroup: pipeline.bindGroups[step % 2]
    })

    cellPlane.update(passEncoder)

    lol.submitPass(passEncoder)
  }

  setInterval(updateGrid, 30)
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
