import { gpuPipeline, getMemory } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

export async function useMoonbow<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  passedOptions: Partial<MoonbowOptions<U, S>>
) {
  const memory = await getMemory(passedOptions)
  return gpuPipeline(memory, {})
}
