export function usePipeline(device, {uniforms, shader, plane, canvas, wireframe = false}) {
  const entries = getEntries(device, uniforms);

  const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: shader,
  });

  const pipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [entries.layout]
    }),
    vertex: {
      module: cellShaderModule,
      entryPoint: "vertexMain",
      buffers: [plane.layout]
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fragmentMain",
      targets: [{format: canvas.format}]
    },
    primitive: {
      topology: wireframe ? "line-list" : "triangle-list",
    },
  });

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: entries.layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader 
    entries: entries.bindGroup
  })

  return {
    pipeline: pipeline,
    bindGroup: bindGroup
  };
}

function getEntries(device, uniforms) {
  const entries = uniforms.map((uniform, index) => {
    return {
      binding: uniform.binding || index, // might be bugged if value is 0 but index is not 0
      visibility: uniform.visibility,
      buffer: { type: 'uniform' },
      resource: { buffer: uniform.buffer }
    }
  });

  const layout = device.createBindGroupLayout({entries})
  return { 
    layout, 
    bindGroup: entries
  }
}

export function uTime(device){
  let time = 0;
  return uniformBuffer(device, {
    update: (buffer) => {
      time++;
      device.queue.writeBuffer(buffer, 0, new Uint32Array([time]));
    }
  });
}

export const uf32 = (device, value) => uniformBuffer(device, {
  update: (buffer) => device.queue.writeBuffer(buffer, 0, new Float32Array(value))
});

function uniformBuffer(device, options) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const buffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  options.update(buffer);
  return {
    binding: options.binding,
    visibility: options.visibility || defaultVisibility,
    buffer: buffer,
    update: () => options.update(buffer)
  };
}
