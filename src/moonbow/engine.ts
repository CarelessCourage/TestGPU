// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, fTime, gpuPipeline, gpuCanvas, gpuCamera } from '../moonbow'
import type { PipelineOptions, GPUCanvas, UB, MoonbowEncoder } from '../moonbow'

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
  model?: boolean
  memory: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<MoonbowMemory<U>>
}

export async function getMemory<U extends MoonbowUniforms>(options: Partial<MoonbowOptions<U>>) {
  const { device } = await useGPU()
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.memory?.({ target, device }).uniforms
  const storage = options.memory?.({ target, device }).storage

  return { uniforms, storage, device, target }
}

export type GetMemory<U extends MoonbowUniforms> = Awaited<ReturnType<typeof getMemory<U>>>

export async function useMoonbow<U extends MoonbowUniforms>(options: Partial<MoonbowOptions<U>>) {
  const memory = await getMemory(options)

  const pipeline = gpuPipeline(memory, {
    model: options.model || false,
    shader: options.shader || shaderSource
  })

  return frames(pipeline, memory)
}

type MoonbowFrameCallback<U extends MoonbowUniforms> = (
  memory: GetMemory<U>,
  encoder: MoonbowEncoder
) => void

function frames<U extends MoonbowUniforms>(
  pipeline: ReturnType<typeof gpuPipeline>,
  memory: GetMemory<U>
) {
  function renderFrame(callback?: MoonbowFrameCallback<U>) {
    pipeline.renderFrame((encoder) => {
      if (!callback) return
      callback(memory, encoder)
    })
  }

  function loop(callback?: MoonbowFrameCallback<U>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return { renderFrame, loop, memory, pipeline }
}

// @ts-ignore
export async function instance(device, { uniforms, canvas, shader }) {
  const target = gpuCanvas(device, canvas)

  const pipeline = gpuPipeline(memory, {
    shader: shader,
    wireframe: false
  })

  return target.render(pipeline)
}
