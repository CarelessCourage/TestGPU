import Shader from "./shader/shader.wgsl";
import { usePipeline } from "./pipeline.js";

async function moonBow() {
  // Setup
  const { device } = await gpuDevice();
  const canvas = gpuCanvas(device);
  
  // Geometry
  const plane = planeBuffer(device);

  // Uniforms
  let elapsedTime = 0;
  const time = uniformBuffer(device, {
    binding: 0,
    label: "Time Uniform Buffer",
    change: (buffer) => {
      const time = elapsedTime++;
      device.queue.writeBuffer(buffer, 0, new Uint32Array([time]));
    },
  });

  const intensity = uniformBuffer(device, {
    binding: 1,
    label: "Intensity Uniform Buffer",
    change: (buffer) => {
      device.queue.writeBuffer(buffer, 0, new Float32Array([0.0]));
    }
  });

  // Assembly
  const entries = getEntries(device, {time, intensity});
  const pipeline = usePipeline(device, {
    shader: Shader,
    entries: entries,
    vertex: {
      entryPoint: "vertexMain",
      buffers: [plane.layout]
    },
    fragment: {
      entryPoint: "fragmentMain",
      targets: [{format: canvas.format}]
    }
  })

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

function getEntries(device, uniforms) {
  const getArray = (obj) => Object.keys(obj).map(key => obj[key]);
  const entries = getArray(uniforms).map((uniform, index) => {
    return {
      binding: uniform.binding || index,
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

function uniformBuffer(device, options) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;
  const intensityBuffer = device.createBuffer({
    label: options.label,
    size: options.size || 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  options.change(intensityBuffer);
  return {
    binding: options.binding || undefined,
    visibility: options.visibility || defaultVisibility,
    buffer: intensityBuffer,
    update: () => options.change(intensityBuffer)
  };
}

function planeBuffer(device) {
  const size = 1.0;
  const vertices = new Float32Array([-size, -size, size, -size, size, size, -size, -size, size,  size, -size, size]);
  const vertexBuffer = device.createBuffer({
    label: "Plane Vertices Buffer",
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
