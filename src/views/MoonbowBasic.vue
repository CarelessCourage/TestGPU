<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { useGPU, uTime, f32, instance, cube } from '../moonbow'

function spinningCube(device: GPUDevice) {
  const resolution = 15
  const size: [number, number, number] = [1, 1, 1]

  const object = cube(device, {
    size,
    resolution,
    position: [0, 0, 0]
  })

  function render(pass: GPURenderPassEncoder, rotation: number) {
    object.set(pass, { rotation: [0.5, rotation, 0] })
  }

  return { render }
}

async function init() {
  const { device } = await useGPU()

  const time = uTime(device)
  const intensity = f32(device, [0.1])
  const model = spinningCube(device)

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

  let rotation = 0
  setInterval(() => {
    rotation += 0.005
    time.update()
    scene1.draw(({ passEncoder }) => model.render(passEncoder, rotation))
    scene2.draw(({ passEncoder }) => model.render(passEncoder, rotation))
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
