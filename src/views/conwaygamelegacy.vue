<script setup lang="ts">
// @ts-ignore
import ConwayShader from '../shaders/conway.wgsl'
// @ts-ignore
import ConwayCompute from '../shaders/conwayCompute.wgsl'
import { onMounted } from 'vue'
import {
  useGPU,
  gpuCanvas,
  float,
  plane,
  getMemory,
  getUniformEntries,
  gpuComputePipeline
} from '../moonbow'
import { cellPong } from '../moonbow/buffers/cellPong'

import { updateGrid } from './test'

function getPlane(device: GPUDevice) {
  const surface = plane(device)
  return {
    buffer: surface.buffer,
    geometry: surface.geometry,
    render: (pass: any) => surface.set(pass, { rotation: [0.0, 0.0, 0] })
  }
}

function bufferLayout(): [GPUVertexBufferLayout, GPUVertexBufferLayout, GPUVertexBufferLayout] {
  const vertexLayout: GPUVertexBufferLayout = {
    arrayStride: 3 * 4,
    attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }]
  }
  const normalLayout: GPUVertexBufferLayout = {
    arrayStride: 3 * 4,
    attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }]
  }
  const uvLayout: GPUVertexBufferLayout = {
    arrayStride: 2 * 4,
    attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }]
  }
  return [vertexLayout, normalLayout, uvLayout]
}

onMounted(async () => {
  //Config
  const GRID_SIZE = 100
  const UPDATE_INTERVAL = 30 // Update every 200ms (5 times/sec)

  const { device } = await useGPU()
  const canvas = document.querySelector('canvas')
  const target = gpuCanvas(device, canvas)
  const model = getPlane(device)

  const cellP = cellPong(device, GRID_SIZE)

  const memory = await getMemory({
    device,
    canvas: document.querySelector('canvas'),
    storage: ({ target }) => ({
      read: cellP.storage[0],
      write: cellP.storage[1]
    }),
    uniforms: ({ target }) => ({
      cellPong: cellP.uniform
    })
  })

  const uniforms = memory.uniforms ? Object.values(memory.uniforms) : []
  const storage = memory.storage ? Object.values(memory.storage) : []

  const entries = getUniformEntries({ device, uniforms })
  const storageEntries = getUniformEntries({ device, uniforms: storage || [] })
  const layout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: [...entries, ...storageEntries].map((entry) => ({
      binding: entry.binding,
      visibility: entry.visibility,
      buffer: entry.buffer
    }))
  })

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: ConwayShader
  })

  const pipelineLayout = device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [layout]
  })

  const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: pipelineLayout, // No longer auto generating it
    vertex: {
      module: cellShaderModule,
      entryPoint: 'vertexMain',
      buffers: bufferLayout()
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: 'fragmentMain',
      targets: [target]
    },
    primitive: {
      topology: 'line-list',
      cullMode: 'back' // ensures backfaces dont get rendered
    }
  })

  // Create the compute shader that will process the simulation.
  const simulationShaderModule = device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: ConwayCompute
  })

  // Create a compute pipeline that updates the game state.
  const simulationPipeline = device.createComputePipeline({
    label: 'Simulation pipeline',
    layout: pipelineLayout,
    compute: {
      module: simulationShaderModule,
      entryPoint: 'computeMain'
    }
  })

  const bindGroups = [
    device.createBindGroup({
      label: 'Cell renderer bind group A',
      layout: layout,
      entries: [
        ...entries,
        {
          binding: 1, //@binding(1) in shader
          resource: storageEntries[0].resource
        },
        {
          binding: 2,
          resource: storageEntries[1].resource
        }
      ]
    }),
    device.createBindGroup({
      label: 'Cell renderer bind group B',
      layout: layout,
      entries: [
        ...entries,
        {
          binding: 1,
          resource: storageEntries[1].resource
        },
        {
          binding: 2,
          resource: storageEntries[0].resource
        }
      ]
    })
  ]

  // Schedule updateGrid() to run repeatedly
  setInterval(
    () =>
      updateGrid({
        device,
        pipeline: {
          pipeline: cellPipeline,
          simulationPipeline,
          bindGroups
        },
        GRID_SIZE,
        target: target,
        model
      }),
    UPDATE_INTERVAL
  )
})
</script>

<template>
  <div class="meta">
    <div class="title">
      <h1>Conway's</h1>
      <h1>game of life</h1>
    </div>
    <p>
      Less than two live neighbors kills the cell, <span class="dim">as if by underpopulation</span>
    </p>
    <p>
      More than three live neighbors kills a cell, <span class="dim">as if by overpopulation</span>
    </p>
    <p>Three live neighbors becomes a live cell, <span class="dim">as if by reproduction</span></p>
  </div>
  <div class="canvas-wrapper">
    <canvas width="512" height="512"></canvas>
  </div>
  <h1 class="display">WebGPU</h1>
</template>

<style scoped>
.title {
  padding-right: 7em;
}

.title h1:nth-of-type(1) {
  font-size: 2.8em;
  opacity: 0.5;
  line-height: 1;
}

p span.dim {
  opacity: 0.3;
}

div.meta {
  position: absolute;
  --padding: 5vw;
  display: grid;
  grid-template-columns: auto repeat(3, 1fr);
  gap: calc(var(--padding) / 2);
  padding-left: var(--padding);
  padding-right: var(--padding);
  top: 10vh;
}
</style>
