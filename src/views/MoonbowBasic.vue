<script lang="ts" setup>
// @ts-ignore
import shader from '../shaders/shader.wgsl'
// @ts-ignore
import basic from '../shaders/basic.wgsl'
import { onMounted } from 'vue'
import { spinningCube } from '../scenes/spinningCube'
import { uTime, float, gpuCamera, useGPU, getMemory, gpuPipeline } from '../moonbow'

onMounted(async () => {
  const { device } = await useGPU()

  const model1 = spinningCube(device)
  const model2 = spinningCube(device)

  const time = uTime(device)
  const intensity = float(device, [0.1])

  // Create shared memory that both pipelines will use
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

  // Create two separate pipelines with different shaders
  const shaderPipeline = gpuPipeline(memory, {
    shader: shader
  })

  const basicPipeline = gpuPipeline(memory, {
    shader: basic
  })

  let rotation = 0
  setInterval(() => {
    rotation += 0.002

    // Create a shared command encoder for both render passes
    const commandEncoder = device.createCommandEncoder({ label: 'Multi-shader Command Encoder' })

    // Create the render pass descriptor
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: 'Multi-shader Render Pass',
      colorAttachments: [
        {
          view: memory.target.context.getCurrentTexture().createView(),
          clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 0.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    }

    // Add depth stencil if enabled
    if (memory.depthStencil) {
      const depthTexture = device.createTexture({
        size: [memory.target.element.width, memory.target.element.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      })

      renderPassDescriptor.depthStencilAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)

    // Render model1 with the shader pipeline
    const bindGroups1 = memory.bindGroups(shaderPipeline.core.bindGroup)
    renderPass.setPipeline(shaderPipeline.core.pipeline)
    renderPass.setBindGroup(0, bindGroups1[0])
    model1.render(renderPass, rotation, -1)

    // Render model2 with the basic pipeline
    const bindGroups2 = memory.bindGroups(basicPipeline.core.bindGroup)
    renderPass.setPipeline(basicPipeline.core.pipeline)
    renderPass.setBindGroup(0, bindGroups2[0])
    model2.render(renderPass, rotation, 2)

    renderPass.end()
    device.queue.submit([commandEncoder.finish()])
  }, 1000 / 60)
})
</script>

<template>
  <div class="canvas-wrapper">
    <canvas id="one" width="700" height="700"></canvas>
    <h1>Multi-Shader Demo (Manual)</h1>
    <p>Left cube uses gradient shader, right cube uses basic shader</p>
  </div>
  <h1 class="display">WebGPU Multi-Shader</h1>
</template>

<style scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.display {
  text-align: center;
  margin-top: 2rem;
}

canvas {
  border: 1px solid #ccc;
  border-radius: 8px;
}

p {
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  max-width: 400px;
}
</style>
