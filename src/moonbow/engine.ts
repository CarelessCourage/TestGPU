// @ts-ignore
import shaderSource from '../shaders/impact.wgsl'
import { useGPU, gpuPipeline, gpuCanvas } from '../moonbow'
import type { PipelineOptions, GPUCanvas, UB, MoonbowEncoder } from '../moonbow'

export interface MoonbowUniforms {
  [key: string]: UB
}

interface MoonbowOptions<U extends MoonbowUniforms>
  extends Omit<PipelineOptions, 'uniforms' | 'storage'> {
  canvas: HTMLCanvasElement | null
  model?: boolean
  memory: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  device?: GPUDevice
}

export async function getMemory<U extends MoonbowUniforms>(
  options: Omit<MoonbowOptions<U>, 'shader'>
) {
  const device = options.device || (await useGPU()).device
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.memory({ target, device })
  const storage = options.memory?.({ target, device }).storage

  delete uniforms?.storage
  return { uniforms, storage, device, target }
}

export type GetMemory<U extends MoonbowUniforms> = Awaited<ReturnType<typeof getMemory<U>>>

export async function useMoonbow<U extends MoonbowUniforms>(options: MoonbowOptions<U>) {
  const memory = await getMemory(options)

  const pipeline = gpuPipeline(memory, {
    model: options.model,
    shader: options.shader || shaderSource
  })

  return frames(pipeline, memory)
}

interface MemoryEncoder<U extends MoonbowUniforms> extends GetMemory<U>, MoonbowEncoder {}

type MoonbowFrameCallback<U extends MoonbowUniforms> = (memoryEncoder: MemoryEncoder<U>) => void

export function frames<U extends MoonbowUniforms>(
  pipeline: ReturnType<typeof gpuPipeline>,
  memory: GetMemory<U>
) {
  function renderFrame(callback?: MoonbowFrameCallback<U>) {
    pipeline.renderFrame((encoder) => {
      if (!callback) return
      callback({ ...memory, ...encoder })
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
