import Shader from "./shader/shader.wgsl";

if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("No appropriate GPUAdapter found.");

const canvas = document.querySelector("canvas");
const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,
  format: canvasFormat,
});

let time = 0;
// Create a uniform buffer
const uniformBufferSize = 4; // size of a u32 in bytes
const uniformBuffer = device.createBuffer({
  label: "Uniform buffer",
  size: uniformBufferSize,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, /*bufferOffset=*/0, new Uint32Array([time]));

const vertices = new Float32Array([-0.8, -0.8, 0.8, -0.8, 0.8,  0.8, -0.8, -0.8, 0.8,  0.8, -0.8,  0.8]);
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

const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: `
    //Structs are like TS interfaces
    struct VertexInput {
        @location(0) pos: vec2f,
        @builtin(instance_index) instance: u32,
    };
    
    struct VertexOutput {
        @builtin(position) pos: vec4f,
        @location(2) uv: vec2f,
    };
    
    @group(0) @binding(0) var<uniform> time: u32;
    
    @vertex
    fn vertexMain(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        var scale = 1.0 + sin(f32(time) * 0.01) * 0.5;
        output.pos = vec4f(input.pos * scale, 0, 1);
        output.uv = input.pos.xy * 0.5 + 0.5;
        return output;
    }
    
    @fragment
    fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        return vec4f(input.uv, 1, 1);
    }
  `
});

const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: device.createPipelineLayout({
    bindGroupLayouts: [
      device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
              type: 'uniform',
            },
          },
        ],
      }),
      // ... other bind group layouts ...
    ],
  }),
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout]
  },
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [{
      //Matches colorAttachments
      format: canvasFormat
    }]
  }
});


// This is where we attach the uniform to the shader through the pipeline
const bindGroup = device.createBindGroup({
  label: "Cell renderer bind group",
  layout: cellPipeline.getBindGroupLayout(0), //@group(0) in shader 
  entries: [{
    binding: 0, //@binding(0) in shader
    resource: { buffer: uniformBuffer } //Buffer resource assigned to this binding
  }],
})

function updateGrid() {
  time++;
  device.queue.writeBuffer(uniformBuffer, 0, new Uint32Array([time]));

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      //@location(0), see fragment shader
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
      storeOp: "store",
    }]
  });

  pass.setPipeline(cellPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setBindGroup(0, bindGroup);
  pass.draw(vertices.length / 2);
  pass.end();

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
}

const UPDATE_INTERVAL = 1000 / 60;
setInterval(updateGrid, UPDATE_INTERVAL);