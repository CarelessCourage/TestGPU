import Shader from "./shader/shader.wgsl";

async function moonBow() {
  // Setup
  const { device } = await gpuDevice();
  const canvas = gpuCanvas(device);
  
  // Geometry
  const plane = planeBuffer(device);

  // Uniforms
  const time = uniformTime(device);
  const intensity = uniformIntensity(device, 0.0);

  // Assembly
  const entries = getEntries(device, {time, intensity});
  const pipeline = usePipeline(device, canvas.format, plane, entries);

  // Render
  useFrame(1000 / 60, () => {
    time.update();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        // @location(0), see fragment shader
        view: canvas.context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
        storeOp: "store",
      }]
    });

    pass.setPipeline(pipeline.pipeline);
    pass.setVertexBuffer(0, plane.buffer);
    pass.setBindGroup(0, pipeline.bindGroup);
    
    pass.draw(plane.vertices.length / 2);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  });
}

moonBow();

async function gpuDevice() {
  if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("No appropriate GPUAdapter found.");

  const device = await adapter.requestDevice();
  return {
    adapter: adapter,
    device: device
  };
}

function gpuCanvas(device) {
  const canvas = document.querySelector("canvas");

  const context = canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });

  return {
    wlement: canvas,
    context: context,
    format: canvasFormat
  };
}

function useFrame(interval = 1000 / 60, update) {
  setInterval(update, interval);
}

function usePipeline(device, canvasFormat, plane, entries) {
  const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: Shader, // `Shader` is a string containing the shader code
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
      // Matches colorAttachments
      targets: [{format: canvasFormat}]
    }
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
  const entries = [{
    binding: 0,
    visibility: GPUShaderStage.FRAGMENT,
    buffer: { type: 'uniform' },
    resource: { buffer: uniforms.time.buffer } // Buffer resource assigned to this binding
  }, {
    binding: 1,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
    buffer: { type: 'uniform' },
    resource: { buffer: uniforms.intensity.buffer }
  }]

  const bindGroupEntries = entries.map(entry => {
    return {
      binding: entry.binding,
      resource: {
        buffer: entry.resource.buffer
      }
    }
  })


  const layout = device.createBindGroupLayout({entries})

  return {
    layout,
    bindGroup: bindGroupEntries
  }
}

function uniformIntensity(device, intensity = 10.0) {
  const intensityBuffer = device.createBuffer({
    label: "Intensity buffer",
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(intensityBuffer, /*bufferOffset=*/0, new Float32Array([intensity]));

  function update(newIntensity) {
    device.queue.writeBuffer(intensityBuffer, 0, new Float32Array([newIntensity]));
  }

  return {
    buffer: intensityBuffer,
    update
  };
}

function uniformTime(device) {
  let time = 0;
  // Create a uniform buffer
  const uniformBufferSize = 4; // Size of a u32 in bytes
  const uniformBuffer = device.createBuffer({
    label: "Uniform buffer",
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, /*bufferOffset=*/0, new Uint32Array([time]));

  function update() {
    time++;
    device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([time]));
  }

  return {
    buffer: uniformBuffer, 
    update: update
  };
}

function planeBuffer(device) {
  const size = 1.0;
  const vertices = new Float32Array([-size, -size, size, -size, size, size, -size, -size, size,  size, -size, size]);
  const vertexBuffer = device.createBuffer({
    label: "Cell vertices",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);

  //Describes how your data is packed in the vertex buffers
  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // builtin(position), see vertex shader
    }],
  };

  return {
    buffer: vertexBuffer,
    vertices: vertices,
    layout: vertexBufferLayout
  }
}
