<template>
  <div class="container">
    <h1>Refraction & Dispersion Demo</h1>
    <canvas id="refractionCanvas" width="800" height="600"></canvas>

    <div class="controls">
      <div class="control-group">
        <h3>Refraction Settings</h3>
        <label>
          IOR Red:
          <input v-model.number="iorR" type="range" min="1.0" max="2.0" step="0.01" />
          {{ iorR.toFixed(2) }}
        </label>
        <label>
          IOR Green:
          <input v-model.number="iorG" type="range" min="1.0" max="2.0" step="0.01" />
          {{ iorG.toFixed(2) }}
        </label>
        <label>
          IOR Blue:
          <input v-model.number="iorB" type="range" min="1.0" max="2.0" step="0.01" />
          {{ iorB.toFixed(2) }}
        </label>
        <label>
          Refract Power:
          <input v-model.number="refractPower" type="range" min="0" max="1" step="0.01" />
          {{ refractPower.toFixed(2) }}
        </label>
        <label>
          Chromatic Aberration:
          <input v-model.number="chromaticAberration" type="range" min="0" max="0.1" step="0.001" />
          {{ chromaticAberration.toFixed(3) }}
        </label>
      </div>

      <div class="control-group">
        <h3>Lighting Settings</h3>
        <label>
          Saturation:
          <input v-model.number="saturation" type="range" min="0" max="3" step="0.1" />
          {{ saturation.toFixed(1) }}
        </label>
        <label>
          Shininess:
          <input v-model.number="shininess" type="range" min="1" max="100" step="1" />
          {{ shininess }}
        </label>
        <label>
          Diffuseness:
          <input v-model.number="diffuseness" type="range" min="0" max="2" step="0.1" />
          {{ diffuseness.toFixed(1) }}
        </label>
        <label>
          Fresnel Power:
          <input v-model.number="fresnelPower" type="range" min="0" max="5" step="0.1" />
          {{ fresnelPower.toFixed(1) }}
        </label>
      </div>

      <div class="control-group">
        <h3>Light Position</h3>
        <label>
          X: <input v-model.number="lightX" type="range" min="-5" max="5" step="0.1" />
          {{ lightX.toFixed(1) }}
        </label>
        <label>
          Y: <input v-model.number="lightY" type="range" min="-5" max="5" step="0.1" />
          {{ lightY.toFixed(1) }}
        </label>
        <label>
          Z: <input v-model.number="lightZ" type="range" min="-5" max="5" step="0.1" />
          {{ lightZ.toFixed(1) }}
        </label>
      </div>
    </div>

    <div class="info">
      <h3>About This Effect</h3>
      <p>
        This demo showcases refraction and dispersion effects similar to those described in
        <a
          href="https://blog.maximeheckel.com/posts/refraction-dispersion-and-other-shader-light-effects/"
          target="_blank"
          >Maxime Heckel's blog post</a
        >.
      </p>
      <p>The effect works by:</p>
      <ul>
        <li>Rendering the scene to a framebuffer object (FBO)</li>
        <li>Using the framebuffer texture to create refraction effects</li>
        <li>Applying chromatic dispersion by separating R, G, B channels</li>
        <li>Adding realistic lighting with specular, diffuse, and Fresnel effects</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import {
  useGPU,
  plane,
  cube,
  gpuCamera,
  getMemory,
  createRefractionPipeline,
  uTime,
  float,
  useMoonbow
} from '@/moonbow'
import type { RefractionPipeline } from '@/moonbow'
import basic from '@/shaders/basic.wgsl?raw'

// Refraction controls
const iorR = ref(1.31)
const iorG = ref(1.32)
const iorB = ref(1.33)
const refractPower = ref(0.1)
const chromaticAberration = ref(0.02)

// Lighting controls
const saturation = ref(1.5)
const shininess = ref(50)
const diffuseness = ref(0.8)
const fresnelPower = ref(2.0)

// Light position
const lightX = ref(0)
const lightY = ref(0)
const lightZ = ref(5)

let device: GPUDevice
let refractionPipeline: RefractionPipeline
let planeModel: any
let cubeModel: any
let memory: any
let basicPipeline: any
let canvasDepthTexture: GPUTexture | null = null

onMounted(async () => {
  await initWebGPU()
  animate()
})

async function initWebGPU() {
  const { device: gpuDevice } = await useGPU()
  device = gpuDevice

  // Create models - making refractive model more visible
  planeModel = cube(device, {
    size: 1.5,
    rotation: [0.2, 0.3, 0.1],
    position: [-1.5, 0, 0]
  })

  // Create background cube for scene
  cubeModel = cube(device, {
    size: 1,
    position: [1.5, 0, 0],
    rotation: [0.5, 0.5, 0]
  })

  const time = uTime(device)
  const intensity = float(device, [0.1])

  // Create memory
  memory = await getMemory({
    device,
    canvas: document.querySelector('canvas#refractionCanvas') as HTMLCanvasElement,
    model: true,
    uniforms: ({ target }) => ({
      time,
      intensity,
      camera: gpuCamera(target)
    })
  })

  // Create basic pipeline for rendering background objects (with depth stencil for framebuffer)
  basicPipeline = await useMoonbow({
    device,
    shader: basic,
    canvas: document.querySelector('canvas#refractionCanvas') as HTMLCanvasElement,
    model: true,
    depthStencil: true,
    uniforms: ({ target }) => ({
      time,
      intensity,
      camera: gpuCamera(target)
    })
  })

  // Create refraction pipeline
  refractionPipeline = createRefractionPipeline(device, memory, {
    iorR: iorR.value,
    iorG: iorG.value,
    iorB: iorB.value,
    refractPower: refractPower.value,
    chromaticAberration: chromaticAberration.value,
    saturation: saturation.value,
    shininess: shininess.value,
    diffuseness: diffuseness.value,
    fresnelPower: fresnelPower.value,
    lightPosition: [lightX.value, lightY.value, lightZ.value]
  })
}

function animate() {
  if (memory && refractionPipeline && planeModel && cubeModel && basicPipeline) {
    // Update model rotations
    const time = performance.now() * 0.001

    // Update background cube rotation
    cubeModel.buffer.update({
      rotation: [time * 0.5, time * 0.3, time * 0.7]
    })

    // Update refractive model rotation to make it more visible
    planeModel.buffer.update({
      rotation: [time * 0.2, time * 0.4, time * 0.1]
    })

    // Update camera position for better view
    memory.uniforms.camera?.update({
      position: [0, 1, 4],
      rotation: [0, 0, 0],
      target: [0, 0, 0]
    })

    // Render scene to framebuffer (excluding the refractive mesh)
    refractionPipeline.renderToFramebuffer((renderPass) => {
      // Render background objects
      renderPass.setPipeline(basicPipeline.core.pipeline)
      const bindGroups = basicPipeline.core.bindGroup ? [basicPipeline.core.bindGroup()] : []
      if (bindGroups.length > 0) {
        renderPass.setBindGroup(0, bindGroups[0])
        cubeModel.bufferModel(renderPass)
        cubeModel.drawModel(renderPass)
      }
    })

    // Render final scene with refraction effect
    const commandEncoder = device.createCommandEncoder({ label: 'Final Scene Render' })

    // Create or reuse depth texture for the canvas render pass
    if (!canvasDepthTexture) {
      canvasDepthTexture = device.createTexture({
        size: {
          width: memory.target.element.width,
          height: memory.target.element.height
        },
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      })
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: 'Final Scene Render Pass',
      colorAttachments: [
        {
          view: memory.target.context.getCurrentTexture().createView(),
          clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ],
      depthStencilAttachment: {
        view: canvasDepthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)

    // Render background objects normally
    renderPass.setPipeline(basicPipeline.core.pipeline)
    const bindGroups = basicPipeline.core.bindGroup ? [basicPipeline.core.bindGroup()] : []
    if (bindGroups.length > 0) {
      renderPass.setBindGroup(0, bindGroups[0])
      cubeModel.bufferModel(renderPass)
      cubeModel.drawModel(renderPass)
    }

    // Render refractive mesh
    refractionPipeline.renderRefractiveMesh(renderPass, (refractivePass) => {
      planeModel.bufferModel(refractivePass)
      planeModel.drawModel(refractivePass)
    })

    renderPass.end()
    device.queue.submit([commandEncoder.finish()])
  }

  requestAnimationFrame(animate)
}

// Watch for parameter changes
watch(
  [
    iorR,
    iorG,
    iorB,
    refractPower,
    chromaticAberration,
    saturation,
    shininess,
    diffuseness,
    fresnelPower,
    lightX,
    lightY,
    lightZ
  ],
  () => {
    if (refractionPipeline) {
      refractionPipeline.updateOptions({
        iorR: iorR.value,
        iorG: iorG.value,
        iorB: iorB.value,
        refractPower: refractPower.value,
        chromaticAberration: chromaticAberration.value,
        saturation: saturation.value,
        shininess: shininess.value,
        diffuseness: diffuseness.value,
        fresnelPower: fresnelPower.value,
        lightPosition: [lightX.value, lightY.value, lightZ.value]
      })
    }
  }
)
</script>

<style scoped>
.container {
  padding: 20px;
}

canvas {
  border: 1px solid #ccc;
  border-radius: 8px;
  display: block;
  margin: 20px auto;
}

.controls {
  display: flex;
  gap: 30px;
  margin: 20px 0;
  flex-wrap: wrap;
}

.control-group {
  flex: 1;
  min-width: 250px;
}

.control-group h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007acc;
  padding-bottom: 8px;
}

label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 14px;
}

input[type='range'] {
  flex: 1;
  margin: 0 10px;
}

.info {
  margin-top: 30px;
  padding: 20px;
  background: black;
  border-radius: 8px;
  border-left: 4px solid #007acc;
}

.info h3 {
  margin-top: 0;
  color: #333;
}

.info p {
  margin: 10px 0;
  line-height: 1.6;
}

.info ul {
  margin: 10px 0;
  padding-left: 20px;
}

.info li {
  margin: 5px 0;
  line-height: 1.4;
}

a {
  color: #007acc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}
</style>
