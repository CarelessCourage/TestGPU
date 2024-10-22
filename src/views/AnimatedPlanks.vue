<script lang="ts" setup>
import { onMounted } from 'vue'
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import {
  useGPU,
  uTime,
  f32,
  instance,
  cube,
  useMoonbow,
  gpuCanvas,
  getMemory,
  gpuPipeline,
  gpuCamera
} from '../moonbow'

function spinningPlanks(device: GPUDevice) {
  const resolution = 15
  const size: [number, number, number] = [1, 1 / 4, 0.05]

  const topPlank = cube(device, {
    size,
    resolution,
    position: [0, 1, 0]
  })

  const middlePlank = cube(device, {
    size,
    resolution,
    position: [0, 0, 0]
  })

  const bottomPlank = cube(device, {
    size,
    resolution,
    position: [0, -1, 0]
  })

  function render(pass: GPURenderPassEncoder, rotation: number) {
    topPlank.set(pass, { rotation: [0, rotation, 0] })
    middlePlank.set(pass, { rotation: [0, rotation - 0.4, 0] })
    bottomPlank.set(pass, { rotation: [0, rotation - 0.8, 0] })
  }

  return { render }
}

async function init() {
  const { device } = await useGPU()

  const memory = await getMemory({
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    shader: shader,
    memory: ({ device, target }) => {
      const time = uTime(device)
      const camera = gpuCamera(target)
      const intensity = f32(device, [0.1])
      return { uniforms: { camera, time, intensity } }
    }
  })

  const pipeline = gpuPipeline(memory, {
    shader: shader,
    wireframe: false
  })

  const model = spinningPlanks(device)

  const scene1 = memory.target.render(pipeline)
  const scene2 = memory.target.render(pipeline)

  let rotation = 0
  setInterval(() => {
    rotation += 0.05
    scene1.draw(({ passEncoder }) => model.render(passEncoder, rotation))
    scene2.draw(({ passEncoder }) => model.render(passEncoder, rotation))
  }, 1000 / 60)
}

onMounted(() => {
  init()
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <canvas id="two" width="700" height="700"></canvas>
    <h1>Animation</h1>
  </div>
  <h1 class="display">WebGPU</h1>
</template>
