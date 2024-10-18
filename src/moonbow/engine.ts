// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, gpuPipeline, gpuCanvas, gpuCamera } from '../moonbow'
import type { PipelineOptions, GPUCanvas, UB } from '../moonbow'
import type { R } from 'node_modules/vite/dist/node/types.d-aGj9QkWt'

interface MoonbowUniforms {
  [key: string]: UB
}

interface MoonbowMemory<U extends MoonbowUniforms = MoonbowUniforms> {
  uniforms: U
  storage: [UB, UB]
  models: any
}

interface MoonbowOptions<U extends MoonbowUniforms>
  extends Omit<PipelineOptions, 'uniforms' | 'storage'> {
  canvas: HTMLCanvasElement | null
  memory: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<MoonbowMemory<U>>
}

async function getMemory<U extends MoonbowUniforms>(options: Partial<MoonbowOptions<U>>) {
  const { device } = await useGPU()
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.memory?.({ target, device }).uniforms
  const storage = options.memory?.({ target, device }).storage

  return { uniforms, storage, device, target }
}

export async function useMoonbow<U extends MoonbowUniforms>(options: Partial<MoonbowOptions<U>>) {
  const memory = await getMemory(options)

  const pipeline = gpuPipeline(memory.target, {
    model: false,
    shader: options.shader || shaderSource,
    uniforms: memory.uniforms ? Object.values(memory.uniforms) : [],
    storage: memory.storage
  })

  return frames(pipeline, memory)
}

function frames<U extends MoonbowUniforms>(
  pipeline: ReturnType<typeof gpuPipeline>,
  memory: Awaited<ReturnType<typeof getMemory<U>>>
) {
  function renderFrame(
    callback?: (props: { target: GPUCanvas; device: GPUDevice; uniforms?: U }) => void
  ) {
    pipeline.renderFrame(() => {
      callback?.({
        target: memory.target,
        device: memory.device,
        uniforms: memory.uniforms
      })
    })
  }

  function loop(
    callback?: (props: { target: GPUCanvas; device: GPUDevice; uniforms?: U }) => void,
    interval = 1000 / 60
  ) {
    setInterval(
      () =>
        pipeline.renderFrame(() => {
          callback?.({
            target: memory.target,
            device: memory.device,
            uniforms: memory.uniforms
          })
        }),
      interval
    )
  }

  return { renderFrame, loop }
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
