export function useMoonbow(device, {uniforms, shader, plane, canvas}) {
  const entries = getEntries(device, uniforms);
  return usePipeline(device, {
    shader,
    entries,
    vertex: {
      entryPoint: "vertexMain",
      buffers: [plane.layout]
    },
    fragment: {
      entryPoint: "fragmentMain",
      targets: [{format: canvas.format}]
    }
  })
}

export function usePipeline(device, options) {
  const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: options.shader, // `Shader` is a string containing the shader code
  });

  const pipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: device.createPipelineLayout({
      bindGroupLayouts: [options.entries.layout]
    }),
    vertex: {
      module: cellShaderModule,
      entryPoint: options.vertex.entryPoint,
      buffers: options.vertex.buffers
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: options.fragment.entryPoint,
      targets: options.fragment.targets
    }
  });

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = device.createBindGroup({
    label: "Cell renderer bind group",
    layout: options.entries.layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader 
    entries: options.entries.bindGroup
  })

  return {
    pipeline: pipeline,
    bindGroup: bindGroup
  };
}

export function getEntries(device, uniforms) {
  const getArray = (obj) => Object.keys(obj).map(key => obj[key]);
  const entries = getArray(uniforms).map((uniform, index) => {
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

export function uniformBuffer(device, options) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const intensityBuffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  options.change(intensityBuffer);
  return {
    binding: options.binding,
    visibility: options.visibility || defaultVisibility,
    buffer: intensityBuffer,
    update: () => options.change(intensityBuffer)
  };
}
