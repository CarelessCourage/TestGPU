// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, gpuPipeline, gpuCanvas, gpuCamera } from '../moonbow'
import type { PipelineOptions, GPUCanvas, UB } from '../moonbow'

interface MoonbowOptions extends Omit<PipelineOptions, 'uniforms' | 'storage'> {
  canvas: HTMLCanvasElement | null
  uniforms: (props: { target: GPUCanvas; device: GPUDevice }) => UB[]
  storage: (props: { target: GPUCanvas; device: GPUDevice }) => UB[]
}

export async function useMoonbow(options: Partial<MoonbowOptions>) {
  const { device } = await useGPU()
  const target = gpuCanvas(device, options.canvas)

  const time = fTime(device)

  const pipeline = gpuPipeline(target, {
    shader: shaderSource,
    model: false,
    uniforms: [time]
  })

  function renderFrame(callback?: () => void) {
    pipeline.renderFrame(() => {
      callback?.()
      time.update()
    })
  }

  return renderFrame
}

// @ts-ignore
export function instance(device, { uniforms, canvas, shader }) {
  const target = gpuCanvas(device, canvas)
  const camera = gpuCamera(target)
  const pipeline = gpuPipeline(target, {
    shader: shader,
    wireframe: false,
    uniforms: [uniforms.time, uniforms.intensity, camera]
  })

  return target.render(pipeline)
}
