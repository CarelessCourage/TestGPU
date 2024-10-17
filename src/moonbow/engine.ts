// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, gpuPipeline, gpuCanvas, gpuCamera } from '../moonbow'
import type { PipelineOptions, GPUCanvas, UB } from '../moonbow'
interface MoonbowOptions<U extends { [key: string]: UB }>
  extends Omit<PipelineOptions, 'uniforms' | 'storage'> {
  canvas: HTMLCanvasElement | null
  uniforms: (props: { target: GPUCanvas; device: GPUDevice }) => U
  storage: (props: { target: GPUCanvas; device: GPUDevice }) => [UB, UB]
}

export async function useMoonbow<U extends { [key: string]: UB }>(
  options: Partial<MoonbowOptions<U>>
) {
  const { device } = await useGPU()
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.uniforms?.({ target, device })
  const storage = options.storage?.({ target, device })

  const pipeline = gpuPipeline(target, {
    model: false,
    shader: options.shader || shaderSource,
    uniforms: uniforms ? Object.values(uniforms) : [],
    storage: storage
  })

  function renderFrame(
    callback?: (props: { target: GPUCanvas; device: GPUDevice; uniforms?: U }) => void
  ) {
    pipeline.renderFrame(() => {
      callback?.({
        target: target,
        device: device,
        uniforms: uniforms
      })
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
