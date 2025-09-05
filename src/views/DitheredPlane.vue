<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
// @ts-ignore
import shader from '@/shaders/ditheredPlane.wgsl'
import {
  useGPU,
  useMoonbow,
  gpuCamera,
  plane,
  uTime,
  float,
  createTextureFromUrl,
  textureBinding,
  samplerBinding
} from '@/moonbow'

const levelsVal = ref(6)

onMounted(async () => {
  const { device } = await useGPU()

  const time = uTime(device)
  // Use intensity as number of levels (e.g. 6 levels)
  const levels = float(device, [levelsVal.value])

  const model = plane(device, { resolution: [1, 1, 1] })

  const tex = await createTextureFromUrl(device, '/sam2.jpg')
  const view = tex.createView()
  const sampler = samplerBinding(device)

  const moon = await useMoonbow({
    device,
    shader,
    canvas: document.querySelector('canvas#dither') as HTMLCanvasElement,
    model: true,
    depthStencil: true,
    cullMode: 'none',
    uniforms: ({ target }) => ({
      time,
      intensity: levels,
      view: gpuCamera(target)
    }),
    resources: () => [textureBinding({ view, binding: 3 }), { ...sampler, binding: 4 }]
  })

  moon.animate(({ frame }) => {
    frame(({ renderPass, uniforms }) => {
      model.setOptions(renderPass, { rotation: [0, 0, 0], position: [0, 0, 0] })
      uniforms.time?.update()
      // Adjust camera to fit plane well
      uniforms.view?.update({ position: [0, 0, 4], target: [0, 0, 0], rotation: [0, 0, 0] })
    })
  })

  // Update the levels uniform when slider changes
  const writeLevels = (val: number) => {
    device.queue.writeBuffer(levels.buffer, 0, new Float32Array([val]))
  }
  // Initialize (float already wrote once, but keep consistent)
  writeLevels(levelsVal.value)
  watch(levelsVal, (v) => writeLevels(v))
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="dither" width="700" height="700"></canvas>
    <h1>Dithered Plane</h1>
    <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px">
      <label for="levels">Levels:</label>
      <input id="levels" type="range" min="2" max="16" step="1" v-model.number="levelsVal" />
      <span>{{ levelsVal }}</span>
    </div>
  </div>
</template>
