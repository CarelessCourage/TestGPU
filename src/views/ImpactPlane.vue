<script setup lang="ts">
// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useTemplateRef, onMounted } from 'vue'
import { useMoonbow, fTime } from '../moonbow'

const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
onMounted(async () => {
  const moon = await useMoonbow({
    canvas: canvasRef.value,
    shader: shaderSource,
    memory: ({ device }) => ({ time: fTime(device) })
  })

  moon.loop(({ uniforms }) => {
    uniforms?.time?.update()
  })
})
</script>

<template>
  <div>
    <canvas ref="canvasRef" width="800" height="600" />
  </div>
</template>
