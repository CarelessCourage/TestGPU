<script setup lang="ts">
import { ref, onMounted } from 'vue'
// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, submitPass, gpuPipeline, applyPipeline, gpuCanvas } from '../moonbow'
import type { UB, GPUCanvas } from '../moonbow'

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface InstanceType {
  uniforms: UB[]
  canvas: HTMLCanvasElement
  shader: string
}

function initRender({ device, context }: Pick<GPUCanvas, 'device' | 'context'>) {
  const commandEncoder = device.createCommandEncoder()
  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        // @location(0), see fragment shader
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }
    ]
  })
  return { commandEncoder, passEncoder }
}

onMounted(async () => {
  if (!canvasRef.value) return
  const { device } = await useGPU()

  const time = fTime(device)

  const target = gpuCanvas(device, canvasRef.value)
  const pipeline = gpuPipeline(target, {
    shader: shaderSource,
    wireframe: false,
    uniforms: [time],
    model: false
  })

  setInterval(() => {
    const render = initRender(target)

    applyPipeline(render.passEncoder, pipeline)
    render.passEncoder.draw(3, 1, 0, 0)
    submitPass(device, render)

    time.update()
  }, 1000 / 60)
})
</script>

<template>
  <div>
    <canvas ref="canvasRef" width="800" height="600" />
  </div>
</template>
