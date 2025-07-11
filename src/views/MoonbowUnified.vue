<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
import { onMounted } from 'vue'
import { spinningCube } from '../scenes/spinningCube'
import { uTime, float, gpuCamera, useGPU, getMemory, gpuPipeline } from '../moonbow'

onMounted(async () => {
  const gpu = await useGPU()

  const model1 = spinningCube(gpu.device) // Keep using device for now
  const model2 = spinningCube(gpu.device)

  // Use TypeGPU-based uniforms with explicit bindings
  const time = uTime(gpu.root, 0.1, 0) // binding 0
  const intensity = float(gpu.root, [0.1], 1) // binding 1

  const memory = await getMemory({
    device: gpu.device,
    root: gpu.root,
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    model: true,
    uniforms: ({ target }) => ({
      time,
      intensity,
      camera: gpuCamera({ device: target.device, aspect: target.aspect }, undefined, 2) // binding 2
    })
  })

  const moon = gpuPipeline(memory, {
    shader: shader
  })

  let rotation = 0
  setInterval(() => {
    rotation += 0.002
    moon.frame(({ renderPass }) => {
      model1.render(renderPass, rotation, -1)
      model2.render(renderPass, rotation, 2)
    })
  }, 1000 / 60)
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <h1>TypeGPU Foundation</h1>
  </div>
  <h1 class="display">Moonbow with TypeGPU</h1>
  <div class="info">
    <p>Same API, but now powered by TypeGPU foundation</p>
    <p>✨ Enhanced type safety and resource management</p>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin: 20px;
}

.display {
  text-align: center;
  margin: 20px;
  color: #333;
}

.info {
  text-align: center;
  margin: 20px;
  color: #666;
}

.info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>
