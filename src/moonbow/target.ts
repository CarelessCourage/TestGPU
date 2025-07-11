import tgpu from 'typegpu'
import type { TgpuRoot } from 'typegpu'

export interface MoonbowGPU {
  root: TgpuRoot
  device: GPUDevice
  adapter: GPUAdapter
}

export async function useGPU(): Promise<MoonbowGPU> {
  if (!navigator.gpu) throw new Error('WebGPU not supported on this browser.')
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) throw new Error('No appropriate GPUAdapter found.')

  const device = await adapter.requestDevice()
  const root = await tgpu.init({ device })

  return {
    root,
    device: root.device,
    adapter
  }
}

export function gpuCanvas(root: TgpuRoot, canvasQuery?: HTMLCanvasElement | null) {
  if (!canvasQuery) throw new Error('No webgpu canvas found.')
  const context = canvasQuery.getContext('webgpu')
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
  if (!context) throw new Error('WebGPU context not available')

  context.configure({
    device: root.device,
    format: canvasFormat
  })

  const target = {
    element: canvasQuery,
    context: context,
    format: canvasFormat,
    device: root.device,
    aspect: canvasQuery.width / canvasQuery.height,
    root: root
  }

  return target
}

export type GPUCanvas = ReturnType<typeof gpuCanvas>
