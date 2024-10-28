import { useGPU, gpuCanvas } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

export async function getMemory<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  options: Omit<MoonbowOptions<U, S>, 'shader'>
) {
  const device = options.device || (await useGPU()).device
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.uniforms({ target, device })
  const storage = options.storage({ target, device })

  delete uniforms?.storage
  return { uniforms, storage, device, target }
}

export type GetMemory<U extends MoonbowUniforms, S extends MoonbowUniforms> = Awaited<
  ReturnType<typeof getMemory<U, S>>
>
