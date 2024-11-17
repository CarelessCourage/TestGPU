import { gpuPipeline, getMemory } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

export async function useMoonbow<
  U extends MoonbowUniforms,
  S extends MoonbowUniforms,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(passedOptions: Partial<MoonbowOptions<U, S, B>>) {
  const memory = await getMemory(passedOptions)
  return gpuPipeline(memory, {})
}
