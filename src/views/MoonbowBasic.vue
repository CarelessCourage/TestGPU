<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { onMounted } from 'vue'
import { spinningCube } from '../scenes/spinningCube'
import { uTime, float, gpuCamera, useGPU, getMemory, gpuPipeline } from '../moonbow'

onMounted(async () => {
  const gpu = await useGPU()

  const model1 = spinningCube(gpu.device)
  const model2 = spinningCube(gpu.device)

  const time = uTime(gpu.root)
  const intensity = float(gpu.root, [0.1])

  const memory = await getMemory({
    device: gpu.device,
    root: gpu.root,
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    model: true,
    uniforms: ({ target }) => ({
      time,
      intensity,
      camera: gpuCamera(target)
    })
  })

  const moon2 = gpuPipeline(memory, {
    shader: shader
  })

  let rotation = 0
  setInterval(() => {
    rotation += 0.002
    moon2.frame(({ renderPass }) => {
      model1.render(renderPass, rotation, -1)
      model2.render(renderPass, rotation, 2)
    })
  }, 1000 / 60)
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <h1>TypeGPU-Powered Moonbow</h1>
  </div>
  <h1 class="display">WebGPU with TypeGPU Foundation</h1>
</template>
