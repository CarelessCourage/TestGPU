import { useGPU, gpuCanvas } from './'
import type { MoonbowUniforms, MoonbowOptions } from './'

/**
 * Gets a device and lets the user allocate uniform/storage buffers to the memory on it. Also assembles the options and assigns the defaults.
 */
export async function getMemory<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  passedOptions: Partial<MoonbowOptions<U, S>>
) {
  const options = await getOptionsWithDefaults(passedOptions)
  const target = gpuCanvas(options.device, options.canvas)

  const uniforms = options.uniforms?.({ target, device: options.device }) || {}
  const storage = options.storage?.({ target, device: options.device }) || {}

  delete uniforms?.storage
  return {
    ...options,
    uniforms,
    storage,
    target
  }
}

async function getOptionsWithDefaults<U extends MoonbowUniforms, S extends MoonbowUniforms>(
  options: Partial<MoonbowOptions<U, S>>
): Promise<MoonbowOptions<U, S>> {
  const device = options.device || (await useGPU()).device
  return {
    uniforms: options.uniforms || (() => ({})),
    storage: options.storage || (() => ({})),
    canvas: options.canvas || null,
    device: device,
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
