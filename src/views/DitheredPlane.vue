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
const monoOn = ref(false)
// Simple RGB picker values [0..1]
const monoR = ref(1.0)
const monoG = ref(1.0)
const monoB = ref(1.0)

onMounted(async () => {
  const { device } = await useGPU()

  const time = uTime(device)
  // Use intensity as number of levels (e.g. 6 levels)
  const levels = float(device, [levelsVal.value])
  // u32-like flag in a f32 buffer (we can use float buffer here since our uniforms helper writes f32)
  const monoEnabled = float(device, [0.0])
  // vec4 color (rgb + pad)
  const monoColor = float(device, [monoR.value, monoG.value, monoB.value, 1.0])

  // Explicitly set uniform bindings to match shader @binding indices
  // Shader expects: time=0, intensity=1, view=2, texture=3, sampler=4, monoEnabled=5, monoColor=6
  time.binding = 0
  levels.binding = 1
  monoEnabled.binding = 5
  monoColor.binding = 6

  const model = plane(device, { resolution: [1, 1, 1], size: [1, 1.4, 1] })

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
    uniforms: ({ target }) => {
      const viewBuf = gpuCamera(target)
      viewBuf.binding = 2
      return {
        time,
        intensity: levels,
        view: viewBuf,
        // Bindings 5 and 6 used in shader
        monoEnabled,
        monoColor
      }
    },
    resources: () => [textureBinding({ view, binding: 3 }), { ...sampler, binding: 4 }]
  })

  moon.animate(({ frame }) => {
    frame(({ renderPass, uniforms }) => {
      model.setOptions(renderPass, { rotation: [0, 0, 0], position: [0, 0, 0] })
      uniforms.time?.update()
      // Adjust camera to fit plane well
      uniforms.view?.update({ position: [0, 0, 10], target: [0, 0, 0], rotation: [0, 0, 0] })
    })
  })

  // Update the levels uniform when slider changes
  const writeLevels = (val: number) => {
    device.queue.writeBuffer(levels.buffer, 0, new Float32Array([val]))
  }
  // Initialize (float already wrote once, but keep consistent)
  writeLevels(levelsVal.value)
  watch(levelsVal, (v) => writeLevels(v))

  // Update monochrome uniforms
  const writeMonoEnabled = (on: boolean) => {
    device.queue.writeBuffer(monoEnabled.buffer, 0, new Float32Array([on ? 1.0 : 0.0]))
  }
  const writeMonoColor = () => {
    device.queue.writeBuffer(
      monoColor.buffer,
      0,
      new Float32Array([monoR.value, monoG.value, monoB.value, 1.0])
    )
  }
  writeMonoEnabled(monoOn.value)
  writeMonoColor()
  watch(monoOn, (v) => writeMonoEnabled(v))
  watch([monoR, monoG, monoB], () => writeMonoColor())
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
    <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap">
      <label><input type="checkbox" v-model="monoOn" /> Monochrome</label>
      <div style="display: flex; align-items: center; gap: 6px">
        <span>R</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="monoR" />
      </div>
      <div style="display: flex; align-items: center; gap: 6px">
        <span>G</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="monoG" />
      </div>
      <div style="display: flex; align-items: center; gap: 6px">
        <span>B</span>
        <input type="range" min="0" max="1" step="0.01" v-model.number="monoB" />
      </div>
    </div>
  </div>
</template>
