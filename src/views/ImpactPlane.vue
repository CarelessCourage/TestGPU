<script setup lang="ts">
// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useTemplateRef, onMounted } from 'vue'
import { useMoonbow, fTime } from '../moonbow'

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
onMounted(async () => {
  const renderFrame = await useMoonbow({
    canvas: canvasRef.value,
    shader: shaderSource,
    uniforms: ({ device }) => {
      const time = fTime(device)
      return { time }
    }
  })

  setInterval(
    () =>
      renderFrame(({ uniforms }) => {
        uniforms?.time.update()
      }),
    1000 / 60
  )
})
</script>

<template>
  <div>
    <canvas ref="canvasRef" width="800" height="600" />
  </div>
</template>
