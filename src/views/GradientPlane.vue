<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/gradient.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { useGPU, uTime, f32, instance, cube } from '../moonbow'

function spinningPlanks(device: GPUDevice) {
  const resolution = 15
  const size: [number, number, number] = [2, 2, 0.05]

  const middlePlank = cube(device, {
    size,
    resolution,
    position: [0, 0, 0]
  })

  function render(pass: GPURenderPassEncoder) {
    middlePlank.set(pass, { rotation: [0, 0, 0] })
  }

  return { render }
}

async function init() {
  const { device } = await useGPU()

  const time = uTime(device)
  const intensity = f32(device, 0.1)
  const model = spinningPlanks(device)

  const scene1 = instance(device, {
    shader: shader,
    uniforms: { time, intensity },
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement
  })

  const scene2 = instance(device, {
    shader: basic,
    uniforms: { time, intensity },
    canvas: document.querySelector('canvas#two') as HTMLCanvasElement
  })

  setInterval(() => {
    time.update()
    scene1.draw(({ pass }) => model.render(pass))
    scene2.draw(({ pass }) => model.render(pass))
  }, 1000 / 60)
}

init()
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <canvas id="two" width="700" height="700"></canvas>
    <h1>Gradient</h1>
  </div>
  <h1 class="display">WebGPU</h1>
</template>
