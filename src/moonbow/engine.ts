import { gpuPipeline, getMemory } from './'
import type { MoonbowRender, MoonbowUniforms, MoonbowOptions, GetMemory } from './'

interface MemoryEncoder<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends GetMemory<U, S>,
    MoonbowRender {}

type MoonbowFrameCallback<U extends MoonbowUniforms, S extends MoonbowUniforms> = (
  memoryEncoder: MemoryEncoder<U, S>
) => void

export async function useMoonbow<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  passedOptions: Partial<MoonbowOptions<U, S>>
) {
  const pack = await getMemory(passedOptions)
  const pipeline = gpuPipeline(pack)
  return getActions<U, S>(pipeline, pack)
}

export function getActions<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  pipeline: ReturnType<typeof gpuPipeline>,
  memory: GetMemory<U, S>
) {
  function renderFrame(callback?: MoonbowFrameCallback<U, S>) {
    pipeline.renderFrame((encoder) => {
      if (!callback) return
      callback({ ...memory, ...encoder })
    })
  }

  function loop(callback?: MoonbowFrameCallback<U, S>, interval = 1000 / 60) {
    setInterval(() => renderFrame(callback), interval)
  }

  return { renderFrame, loop, memory, pipeline }
}
