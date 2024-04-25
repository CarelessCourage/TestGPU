function uniformBuffer(device, options): UB {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  // Passes the buffer to the update callback
  options.update(buffer)
  return {
    binding: options.binding,
    visibility: options.visibility || defaultVisibility,
    buffer: buffer,
    update: () => options.update(buffer)
  }
}

const cellstate = pingpong()
const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)

function setPing(buffer) {
  for (let i = 0; i < cellStateArray.length; ++i) {
    cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
  }
  device.queue.writeBuffer(buffer, 0, cellStateArray)
}

function setPong(buffer) {
  for (let i = 0; i < cellStateArray.length; i++) {
    cellStateArray[i] = i % 2
  }
  device.queue.writeBuffer(buffer, 0, cellStateArray)
}

pingpong(device, {
  size: cellStateArray.byteLength,
  update: (ping, pong) => {
    setPing(ping)
    setPong(pong)
  }
})

function pingpong(device, options) {
  const stateA = device.createBuffer({
    label: 'Ping Storage',
    size: options.size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  const stateB = device.createBuffer({
    label: 'Pong Storage',
    size: options.size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  })

  return {
    binding: 2,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
    buffer: stateA,
    update: () => options.update(buffer)
  }
}

function getEntries(device, uniforms) {
  const entries = uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
    buffer: { type: uniform.type },
    resource: { buffer: uniform.buffer }
  }))

  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: entries
  })

  return {
    layout: bindGroupLayout,
    bindGroup: entries
  }
}

const bindGroups = [
  device.createBindGroup({
    label: 'Cell renderer bind group A',
    //layout: cellPipeline.getBindGroupLayout(0), //@group(0) in shader - this just auto generates the layout from the cellPipeline
    layout: bindGroupLayout, // No longer auto generating it
    entries: [
      {
        binding: 0, //@binding(0) in shader
        resource: { buffer: grid.buffer } // Buffer resource assigned to this binding
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
