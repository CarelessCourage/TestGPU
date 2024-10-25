import { gpuPipeline, getMemory } from './'
import type { MoonbowEncoder, MoonbowUniforms, MoonbowOptions, GetMemory } from './'

interface MemoryEncoder<U extends MoonbowUniforms> extends GetMemory<U>, MoonbowEncoder {}
type MoonbowFrameCallback<U extends MoonbowUniforms> = (memoryEncoder: MemoryEncoder<U>) => void

export async function useMoonbow<U extends MoonbowUniforms>(options: MoonbowOptions<U>) {
  const memory = await getMemory(options)

  const pipeline = gpuPipeline(memory, {
    model: options.model,
    shader: options.shader
  })

  return frames<U>(pipeline, memory)
}

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
