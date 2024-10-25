import { useGPU, gpuCanvas } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

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
