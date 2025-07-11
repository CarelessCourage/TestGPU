import { gpuPipeline } from './'
import { toGPUColor, BackgroundColors } from './background'
import type { GetMemory, MoonbowBuffers, MoonbowPipelineOptions } from './'
import type { BackgroundColor } from './background'

export interface ShaderObject {
  shader: string
  label?: string
}

export interface MultiShaderRenderCall {
  pipeline: string | number
  renderFunction: (renderPass: GPURenderPassEncoder) => void
}

export interface MultiShaderOptions {
  backgroundColor?: BackgroundColor
  baseOptions?: Partial<Omit<MoonbowPipelineOptions, 'shader'>>
}

/**
 * Creates multiple pipelines from shared memory, each with a different shader
 */
export function createMultiShaderPipelines<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(
  memory: GetMemory<U, S, B>,
  shaders: ShaderObject[] | Record<string, string>,
  options?: MultiShaderOptions
) {
  const shadersArray = Array.isArray(shaders)
    ? shaders
    : Object.entries(shaders).map(([label, shader]) => ({ label, shader }))

  const pipelines = shadersArray.map((shaderObj, index) => {
    const pipeline = gpuPipeline(memory, {
      ...options?.baseOptions,
      shader: shaderObj.shader
    })

    return {
      pipeline,
      label: shaderObj.label || `shader-${index}`,
      index
    }
  })

  // Get background color or use default
  const backgroundColor = options?.backgroundColor
    ? toGPUColor(options.backgroundColor)
    : BackgroundColors.default

  /**
   * Creates a render frame that can render multiple objects with different shaders
   */
  function multiFrame(renderCalls: MultiShaderRenderCall[]) {
    const device = memory.target.device
    const commandEncoder = device.createCommandEncoder({
      label: 'Multi-shader Command Encoder'
    })

    // Create the render pass descriptor
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: 'Multi-shader Render Pass',
      colorAttachments: [
        {
          view: memory.target.context.getCurrentTexture().createView(),
          clearValue: backgroundColor,
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    }

    // Add depth stencil if enabled
    if (memory.depthStencil) {
      const depthTexture = device.createTexture({
        size: [memory.target.element.width, memory.target.element.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      })

      renderPassDescriptor.depthStencilAttachment = {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
      }
    }

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor)

    // Execute each render call with its corresponding pipeline
    renderCalls.forEach(({ pipeline: pipelineId, renderFunction }) => {
      const pipelineObj =
        typeof pipelineId === 'string'
          ? pipelines.find((p) => p.label === pipelineId)
          : pipelines[pipelineId]

      if (!pipelineObj) {
        console.warn(`Pipeline not found: ${pipelineId}`)
        return
      }

      const bindGroups = memory.bindGroups(pipelineObj.pipeline.core.bindGroup)
      renderPass.setPipeline(pipelineObj.pipeline.core.pipeline)
      renderPass.setBindGroup(0, bindGroups[0])
      renderFunction(renderPass)
    })

    renderPass.end()
    device.queue.submit([commandEncoder.finish()])
  }

  /**
   * Get a specific pipeline by label or index
   */
  function getPipeline(id: string | number) {
    return typeof id === 'string'
      ? pipelines.find((p) => p.label === id)?.pipeline
      : pipelines[id]?.pipeline
  }

  return {
    pipelines: pipelines.map((p) => ({ label: p.label, pipeline: p.pipeline })),
    multiFrame,
    getPipeline,
    memory
  }
}

export type MultiShaderPipelines = ReturnType<typeof createMultiShaderPipelines>
