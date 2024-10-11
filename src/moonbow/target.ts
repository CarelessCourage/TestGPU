import { render } from './render.js'
import type { RenderOutput } from './render.js'
import type { Pipeline } from './pipeline.js'

export interface GPU {
  device: GPUDevice
  adapter: GPUAdapter
}

export async function useGPU() {
  if (!navigator.gpu) throw new Error('WebGPU not supported on this browser.')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('No appropriate GPUAdapter found.')
  const device = await adapter.requestDevice()

  return {
    adapter: adapter,
    device: device
  }
}

export interface GPUCanvas {
  element: HTMLCanvasElement
  context: GPUCanvasContext
  format: GPUTextureFormat
  device: GPUDevice
  aspect: number
  render: (pipeline: Pipeline) => RenderOutput
}

export function gpuCanvas(device: GPUDevice, canvasQuery: HTMLCanvasElement | null): GPUCanvas {
  const { context, format, canvas } = preflightChecks(canvasQuery)

  context.configure({
    device: device,
    format: format
  })

  const target = {
    element: canvas,
    context: context,
    format: format,
    device: device,
    aspect: canvas.width / canvas.height,
    render: (pipeline: Pipeline) => render(target, pipeline)
  }

  return target
}

function preflightChecks(canvas = document.querySelector('canvas')) {
  if (!canvas) throw new Error('No webgpu canvas found.')
  const context = canvas.getContext('webgpu')
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  if (!context) throw new Error('WebGPU context not available')
  return {
    canvas: canvas,
    context: context,
    format: canvasFormat
  }
}
