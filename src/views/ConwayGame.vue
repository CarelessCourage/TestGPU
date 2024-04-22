<script setup>
import ConwayShader from '../shaders/conway.wgsl'
import ConwayCompute from '../shaders/conwayCompute.wgsl'
import { onMounted } from 'vue'
import { useGPU, gpuCanvas, gpuPipeline, uTime, f32, plane, bufferLayout } from '../moonbow'

function getPlane(device) {
  const surface = plane(device)
  return {
    buffer: surface.buffer,
    geometry: surface.geometry,
    render: (pass) => surface.set(pass, { rotation: [0.0, 0.0, 0] })
  }
}

onMounted(async () => {
  //Config
  const GRID_SIZE = 10
  const UPDATE_INTERVAL = 30 // Update every 200ms (5 times/sec)

  const { device } = await useGPU()
  const canvas = document.querySelector('canvas')
  const target = gpuCanvas(device, canvas)
  const model = getPlane(device)

  // target.render((pass) => {
  //   model.render(pass)
  // })

  // const pipeline = gpuPipeline(target, {
  //   shader: shader,
  //   wireframe: false,
  //   uniforms: [uniforms.time, uniforms.intensity, camera]
  // })

  const grid = f32(device, [GRID_SIZE, GRID_SIZE])

  // Create an array representing the active state of each cell.
  // Storage buffers are more flexible and much bigger than uniform buffers
  // but uniform buffers are sometimes prioritised by the GPU so they might be faster depending on the GPU

  const cellstate = pingpong()

  function pingpong() {
    const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

    const stateA = device.createBuffer({
      label: 'Cell - State A',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    const stateB = device.createBuffer({
      label: 'Cell - State B',
      size: cellStateArray.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })

    // Set each cell to a random state, then copy the JavaScript array
    // into the storage buffer.
    for (let i = 0; i < cellStateArray.length; ++i) {
      cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
    }
    device.queue.writeBuffer(stateA, 0, cellStateArray)

    // Mark every other cell of the second grid as active.
    for (let i = 0; i < cellStateArray.length; i++) {
      cellStateArray[i] = i % 2 // We are saving memory by reusing the same array
    }
    device.queue.writeBuffer(stateB, 0, cellStateArray)

    return {
      a: stateA,
      b: stateB
    }
  }

  const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: ConwayShader
  })

  // We create this layout because we are sharing the same bindlayout between two diffirent shaders - and one shader might use a diffirent amount of stuff from the layout than another shader.
  // Normally we could just auto it bit because of this variation we need to define what the layout is
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Cell Bind Group Layout',
    entries: [
      {
        binding: 0,
        // Add GPUShaderStage.FRAGMENT here if you are using the `grid` uniform in the fragment shader.
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
        buffer: {} // Grid uniform buffer
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' } // Cell state input buffer
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' } // Cell state output buffer
      }
    ]
  })

  const pipelineLayout = device.createPipelineLayout({
    label: 'Pipeline Layout',
    bindGroupLayouts: [bindGroupLayout]
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

  const WORKGROUP_SIZE = 8
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

  // This is where we attach the uniform to the shader through the pipeline
  // Its doubbled up because we are using the ping-pong buffer pattern
  const bindGroups = [
    device.createBindGroup({
      label: 'Cell renderer bind group A',
      //layout: cellPipeline.getBindGroupLayout(0), //@group(0) in shader - this just auto generates the layout from the cellPipeline
      layout: bindGroupLayout, // No longer auto generating it
      entries: [
        {
          binding: 0, //@binding(0) in shader
          resource: { buffer: grid.buffer } //Buffer resource assigned to this binding
        },
        {
          binding: 1, //@binding(1) in shader
          resource: { buffer: cellstate.a }
        },
        {
          binding: 2,
          resource: { buffer: cellstate.b }
        }
      ]
    }),
    device.createBindGroup({
      label: 'Cell renderer bind group B',
      //layout: cellPipeline.getBindGroupLayout(0),
      layout: bindGroupLayout, // No longer auto generating it
      entries: [
        {
          binding: 0,
          resource: { buffer: grid.buffer }
        },
        {
          binding: 1,
          resource: { buffer: cellstate.b }
        },
        {
          binding: 2,
          resource: { buffer: cellstate.a }
        }
      ]
    })
  ]

  let step = 0 // Track how many simulation steps have been run

  function updateGrid() {
    const encoder = device.createCommandEncoder()
    const computePass = encoder.beginComputePass()

    // Compute work
    computePass.setPipeline(simulationPipeline)
    computePass.setBindGroup(0, bindGroups[step % 2])

    const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE)
    computePass.dispatchWorkgroups(workgroupCount, workgroupCount)
    // DispatchWorkgroups numbers arenot the number of invocations!
    // Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in the shader

    computePass.end()

    step++

    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          //@location(0), see fragment shader
          view: target.context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
          storeOp: 'store'
        }
      ]
    })

    pass.setPipeline(cellPipeline)

    pass.setVertexBuffer(0, model.buffer.vertices)
    pass.setVertexBuffer(1, model.buffer.normals)
    pass.setVertexBuffer(2, model.buffer.uvs)

    pass.setBindGroup(0, bindGroups[step % 2]) // Makes sure the bind group with all the uniform stuff is actually being used in the pass
    // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
    // You're saying that each @binding that's part of @group(0) uses the resources in this bind group.

    // Draw Geometry
    pass.setIndexBuffer(model.buffer.indices, 'uint16')
    pass.drawIndexed(
      model.buffer.indicesCount,
      GRID_SIZE * GRID_SIZE, // 16 instances
      0,
      0,
      0
    )

    pass.end()

    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
  }

  // Schedule updateGrid() to run repeatedly
  setInterval(updateGrid, UPDATE_INTERVAL)
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
