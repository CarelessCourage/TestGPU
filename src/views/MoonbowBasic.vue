<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { onMounted } from 'vue'
import { spinningCube } from '../scenes/spinningCube'
import { uTime, float, gpuCamera, useMoonbow, useGPU, getMemory, gpuPipeline } from '../moonbow'

onMounted(async () => {
  const { device } = await useGPU()

  const time = uTime(device)
  const intensity = float(device, [0.1])

  const model = spinningCube(device)

  const memory = await getMemory({
    device,
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    model: true,
    uniforms: ({ target }) => ({
      time: time,
      intensity: intensity,
      camera: gpuCamera(target)
    })
  })

  const moon = gpuPipeline(memory, {
    shader: shader
  })

  const moon2 = gpuPipeline(memory, {
    shader: basic
  })

  let rotation = 0
  setInterval(() => {
    rotation += 0.02
    moon.frame(({ renderPass }) => {
      model.render(renderPass, rotation, -2)
    })

    moon2.frame(({ renderPass }) => {
      model.render(renderPass, rotation, 2)
    })
  }, 1000 / 60)
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <h1>Gradient</h1>
  </div>
  <h1 class="display">WebGPU</h1>
</template>
