//@ts-ignore
import Shader from "./shader/shader.wgsl";

// const options = {
//   shader: Shader,
//   entries: undefined,
//   vertex: {
//     entryPoint: "vertexMain",
//     buffers: undefined, // [plane.layout]
//   },
//   fragment: {
//     entryPoint: "fragmentMain",
//     targets: undefined, // [{format: canvasFormat}]
//   }
// };

export function usePipeline(device, options) {
    const cellShaderModule = device.createShaderModule({
      label: "Cell shader",
      code: Shader, // `Shader` is a string containing the shader code
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