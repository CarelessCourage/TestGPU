<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { onMounted } from 'vue'
import { spinningCube } from '../scenes/spinningCube'
import {
  uTime,
  float,
  gpuCamera,
  useGPU,
  getMemory,
  gpuPipeline,
  createCompatibleUniforms
} from '../moonbow'

onMounted(async () => {
  const { device } = await useGPU()

  // === LEGACY API (Your existing approach) ===
  const model1 = spinningCube(device)
  const model2 = spinningCube(device)

  const time = uTime(device)
  const intensity = float(device, [0.1])

  const memory = await getMemory({
    device,
    canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    model: true,
    uniforms: ({ target }) => ({
      time,
      intensity,
      camera: gpuCamera(target)
    })
  })

  const moon1 = gpuPipeline(memory, {
    shader: shader
  })

  // === NEW TYPEGPU API (Same interface, TypeGPU under the hood) ===
  const canvas2 = document.querySelector('canvas#two') as HTMLCanvasElement

  if (canvas2) {
    // Create TypeGPU-based uniforms that are compatible with your existing API
    const typeGpuUniforms = await createCompatibleUniforms({
      device,
      canvas: canvas2
    })

    const typeGpuTime = typeGpuUniforms.uTime(0.002)
    const typeGpuIntensity = typeGpuUniforms.float([0.2])

    const typeGpuMemory = await getMemory({
      device,
      canvas: canvas2,
      model: true,
      uniforms: ({ target }) => ({
        time: typeGpuTime,
        intensity: typeGpuIntensity,
        camera: gpuCamera(target)
      })
    })

    const moon2 = gpuPipeline(typeGpuMemory, {
      shader: basic
    })

    const model3 = spinningCube(device)
    const model4 = spinningCube(device)

    // Animation loop with both approaches
    let rotation = 0
    setInterval(() => {
      rotation += 0.002

      // Legacy approach
      moon1.frame(({ renderPass }) => {
        model1.render(renderPass, rotation, -1)
        model2.render(renderPass, rotation, 2)
      })

      // TypeGPU approach - same API, TypeGPU foundation
      moon2.frame(({ renderPass }) => {
        model3.render(renderPass, rotation, -1)
        model4.render(renderPass, rotation, 2)
      })
    }, 1000 / 60)
  } else {
    // Fallback to single canvas
    let rotation = 0
    setInterval(() => {
      rotation += 0.002
      moon1.frame(({ renderPass }) => {
        model1.render(renderPass, rotation, -1)
        model2.render(renderPass, rotation, 2)
      })
    }, 1000 / 60)
  }
})
</script>

<template>
  <div class="canvas-wrapper">
    <div class="canvas-container">
      <canvas id="one" width="350" height="350"></canvas>
      <div class="canvas-label">Legacy WebGPU</div>
    </div>
    <div class="canvas-container">
      <canvas id="two" width="350" height="350"></canvas>
      <div class="canvas-label">TypeGPU Foundation</div>
    </div>
  </div>
  <h1 class="display">Moonbow: Legacy vs TypeGPU Foundation</h1>
  <div class="info">
    <p><strong>Left:</strong> Your existing Moonbow API with direct WebGPU</p>
    <p><strong>Right:</strong> Same API, same experience - but TypeGPU foundation underneath</p>
    <p>
      <em
        >The API stays the same, but you get TypeGPU's type safety and features when you need
        them</em
      >
    </p>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  display: flex;
  gap: 20px;
  justify-content: center;
  align-items: center;
  margin: 20px;
}

.canvas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.canvas-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
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
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.info p {
  margin: 5px 0;
  font-size: 14px;
}

.info strong {
  color: #333;
}

.info em {
  color: #999;
  font-style: italic;
}
</style>
