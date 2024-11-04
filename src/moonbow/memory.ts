import { useGPU, gpuCanvas } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

export async function getMemory<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  passedOptions: Omit<Partial<MoonbowOptions<U, S>>, 'shader'>
) {
  const options = getOptions(passedOptions)
  const device = options.device || (await useGPU()).device
  const target = gpuCanvas(device, options.canvas)

  const uniforms = options.uniforms?.({ target, device }) || {}
  const storage = options.storage?.({ target, device }) || {}

  delete uniforms?.storage
  return {
    memory: { uniforms, storage, device, target },
    options
  }
}

function getOptions<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  options: Partial<MoonbowOptions<U, S>>
): MoonbowOptions<U, S> {
  return {
    uniforms: options.uniforms || (() => ({})),
    storage: options.storage || (() => ({})),
    canvas: options.canvas || null,
    device: options.device,
    model: options.model || true,
    shader: options.shader || '',
    computeShader: options.computeShader || '',
    wireframe: options.wireframe || false,
    depthStencil: options.depthStencil || false
  }
}

export type GetMemory<U extends MoonbowUniforms, S extends MoonbowUniforms> = Awaited<
  ReturnType<typeof getMemory<U, S>>
>
