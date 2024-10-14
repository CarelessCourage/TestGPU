<script setup lang="ts">
import { ref, useTemplateRef, onMounted } from 'vue'
// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, gpuPipeline, gpuCanvas } from '../moonbow'
import type { GPUCanvas, Pipeline } from '../moonbow'

function renderFrame({ device, context }: Pick<GPUCanvas, 'device' | 'context'>) {
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

  function drawPass(pipeline: Pipeline) {
    passEncoder.setPipeline(pipeline.pipeline)
    passEncoder.setBindGroup(0, pipeline.bindGroup)
    passEncoder.draw(3, 1, 0, 0)
  }

  function submitPass() {
    passEncoder.end()
    const commandBuffer = commandEncoder.finish()
    device.queue.submit([commandBuffer])
  }

  function frame(pipeline: Pipeline, callback?: () => void) {
    drawPass(pipeline)
    callback?.()
    submitPass()
  }

  return {
    commandEncoder,
    passEncoder,
    drawPass,
    submitPass,
    frame
  }
}

async function useMoonbow(canvas: HTMLCanvasElement) {
  const { device } = await useGPU()
  const time = fTime(device)

  const target = gpuCanvas(device, canvas)
  const pipeline = gpuPipeline(target, {
    shader: shaderSource,
    wireframe: false,
    uniforms: [time],
    model: false
  })

  function frame(callback?: () => void) {
    renderFrame(target).frame(pipeline, () => {
      callback?.()
      time.update()
    })
  }

  return { frame }
}

const canvasRef = useTemplateRef('canvasRef')
onMounted(async () => {
  if (!canvasRef.value) return
  const { frame } = await useMoonbow(canvasRef.value)
  setInterval(frame, 1000 / 60)
})
</script>

<template>
  <div>
    <canvas ref="canvasRef" width="800" height="600" />
  </div>
</template>
