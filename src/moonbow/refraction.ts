/// <reference types="@webgpu/types" />
import { createRefractionFramebuffers } from './framebuffer'
import type { RefractionFramebuffers } from './framebuffer'
import { gpuPipeline } from './pipeline'
import type { GetMemory } from './memory'

export interface RefractionOptions {
  ior?: number
  refractPower?: number
  chromaticAberration?: number
  saturation?: number
  shininess?: number
  diffuseness?: number
  fresnelPower?: number
  lightPosition?: [number, number, number]
  samples?: number

  // Individual IOR values for advanced dispersion
  iorR?: number
  iorG?: number
  iorB?: number

  // For rygcbv color space (advanced)
  iorY?: number
  iorC?: number
  iorV?: number
}

export interface RefractionPipeline {
  renderToFramebuffer: (renderFunction: (renderPass: GPURenderPassEncoder) => void) => void
  renderRefractiveMesh: (
    renderPass: GPURenderPassEncoder,
    meshRenderFunction: (renderPass: GPURenderPassEncoder) => void
  ) => void
  renderWithBackside: (
    renderFunction: (renderPass: GPURenderPassEncoder) => void,
    meshRenderFunction: (renderPass: GPURenderPassEncoder) => void
  ) => void
  updateOptions: (options: RefractionOptions) => void
  framebuffers: RefractionFramebuffers
  pipeline: any
  destroy: () => void
}

export function createRefractionPipeline(
  device: GPUDevice,
  memory: GetMemory<any, any, any>,
  options: RefractionOptions = {}
): RefractionPipeline {
  const {
    refractPower = 0.1,
    chromaticAberration = 0.02,
    saturation = 1.5,
    shininess = 50.0,
    diffuseness = 0.8,
    fresnelPower = 2.0,
    lightPosition = [0, 0, 5],
    iorR = 1.31,
    iorG = 1.32,
    iorB = 1.33
  } = options

  const canvas = memory.target.element
  const framebuffers = createRefractionFramebuffers(
    device,
    canvas.width,
    canvas.height,
    memory.target.format
  )

  // Create uniforms buffer for dispersion parameters
  const uniformsData = new Float32Array([
    iorR,
    iorG,
    iorB,
    refractPower,
    chromaticAberration,
    saturation,
    shininess,
    diffuseness,
    fresnelPower,
    0, // padding
    canvas.width,
    canvas.height, // resolution
    lightPosition[0],
    lightPosition[1],
    lightPosition[2],
    0 // light position + padding
  ])

  const uniformsBuffer = device.createBuffer({
    label: 'Refraction Uniforms',
    size: uniformsData.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  device.queue.writeBuffer(uniformsBuffer, 0, uniformsData)

  // Create sampler for future use
  const _sampler = device.createSampler({
    label: 'Refraction Sampler',
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge'
  })

  // Create the dispersion pipeline
  const pipeline = gpuPipeline(memory, {
    depthStencil: true,
    shader: `
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) uv: vec2<f32>,
        @location(1) worldPos: vec3<f32>,
        @location(2) worldNormal: vec3<f32>,
        @location(3) eyeVector: vec3<f32>,
      }
      
      @vertex
      fn vertexMain(
        @location(0) position: vec3<f32>,
        @location(1) normal: vec3<f32>,
        @location(2) uv: vec2<f32>
      ) -> VertexOutput {
        var output: VertexOutput;
        
        // Transform position
        let worldPos = vec4<f32>(position, 1.0);
        output.position = worldPos;
        output.uv = uv;
        output.worldPos = position;
        output.worldNormal = normalize(normal);
        output.eyeVector = normalize(vec3<f32>(0.0, 0.0, 1.0) - position);
        
        return output;
      }
      
      @fragment
      fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
        // Calculate screen UV coordinates  
        let screenUV = (input.position.xy / vec2<f32>(800.0, 600.0));
        
        // Basic refraction using normal
        let refractionVector = refract(input.eyeVector, input.worldNormal, 0.75);
        let refractedUV = screenUV + refractionVector.xy * 0.1;
        
        // Make it bright and colorful for visibility
        let r = 0.8 + sin(input.worldPos.x * 3.0) * 0.2; // Bright red
        let g = 0.3 + sin(input.worldPos.y * 2.0) * 0.2; // Some green
        let b = 0.9 + sin(input.worldPos.z * 4.0) * 0.1; // Bright blue
        
        // Create base color - more saturated for visibility
        let baseColor = vec3<f32>(r, g, b);
        
        // Add Fresnel effect for glass-like appearance
        let fresnel = pow(1.0 - abs(dot(input.eyeVector, input.worldNormal)), 1.5);
        let fresnelColor = mix(baseColor, vec3<f32>(1.0, 1.0, 0.8), fresnel * 0.4);
        
        // Make it much less transparent so it's easier to see
        let alpha = 0.9; // Almost opaque
        
        return vec4<f32>(fresnelColor, alpha);
      }
    `
  })

  function renderToFramebuffer(renderFunction: (renderPass: GPURenderPassEncoder) => void) {
    const commandEncoder = device.createCommandEncoder({ label: 'Refraction FBO Render' })
    const renderPass = commandEncoder.beginRenderPass(framebuffers.main.renderPassDescriptor)

    renderFunction(renderPass)

    renderPass.end()
    device.queue.submit([commandEncoder.finish()])
  }

  function renderRefractiveMesh(
    renderPass: GPURenderPassEncoder,
    meshRenderFunction: (renderPass: GPURenderPassEncoder) => void
  ) {
    // Set the refraction pipeline
    const bindGroups = memory.bindGroups(pipeline.core.bindGroup)
    renderPass.setPipeline(pipeline.core.pipeline)
    renderPass.setBindGroup(0, bindGroups[0])

    // Render the mesh
    meshRenderFunction(renderPass)
  }

  function renderWithBackside(
    renderFunction: (renderPass: GPURenderPassEncoder) => void,
    meshRenderFunction: (renderPass: GPURenderPassEncoder) => void
  ) {
    // Step 1: Render scene to back framebuffer
    const backCommandEncoder = device.createCommandEncoder({ label: 'Back FBO Render' })
    const backRenderPass = backCommandEncoder.beginRenderPass(
      framebuffers.back.renderPassDescriptor
    )

    renderFunction(backRenderPass)

    backRenderPass.end()
    device.queue.submit([backCommandEncoder.finish()])

    // Step 2: Render main scene to main framebuffer
    const mainCommandEncoder = device.createCommandEncoder({ label: 'Main FBO Render' })
    const mainRenderPass = mainCommandEncoder.beginRenderPass(
      framebuffers.main.renderPassDescriptor
    )

    renderFunction(mainRenderPass)

    mainRenderPass.end()
    device.queue.submit([mainCommandEncoder.finish()])

    // Step 3: Render to screen with refraction effect
    const screenCommandEncoder = device.createCommandEncoder({ label: 'Screen Render' })
    const screenRenderPass = screenCommandEncoder.beginRenderPass({
      label: 'Screen Render Pass',
      colorAttachments: [
        {
          view: memory.target.context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    })

    renderRefractiveMesh(screenRenderPass, meshRenderFunction)

    screenRenderPass.end()
    device.queue.submit([screenCommandEncoder.finish()])
  }

  function updateOptions(newOptions: RefractionOptions) {
    const updatedData = new Float32Array([
      newOptions.iorR ?? iorR,
      newOptions.iorG ?? iorG,
      newOptions.iorB ?? iorB,
      newOptions.refractPower ?? refractPower,
      newOptions.chromaticAberration ?? chromaticAberration,
      newOptions.saturation ?? saturation,
      newOptions.shininess ?? shininess,
      newOptions.diffuseness ?? diffuseness,
      newOptions.fresnelPower ?? fresnelPower,
      0, // padding
      canvas.width,
      canvas.height, // resolution
      newOptions.lightPosition?.[0] ?? lightPosition[0],
      newOptions.lightPosition?.[1] ?? lightPosition[1],
      newOptions.lightPosition?.[2] ?? lightPosition[2],
      0 // padding
    ])

    device.queue.writeBuffer(uniformsBuffer, 0, updatedData)
  }

  function destroy() {
    framebuffers.main.destroy()
    framebuffers.back.destroy()
    uniformsBuffer.destroy()
  }

  return {
    renderToFramebuffer,
    renderRefractiveMesh,
    renderWithBackside,
    updateOptions,
    framebuffers,
    pipeline,
    destroy
  }
}
