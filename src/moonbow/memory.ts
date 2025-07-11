import { useGPU, gpuCanvas } from './'
import type { MoonbowBuffers, MoonbowOptions, BindGroup } from './'
import type { TgpuRoot } from 'typegpu'

/**
 * Gets a TypeGPU root and lets the user allocate uniform/storage buffers to the memory on it.
 */
export async function getMemory<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(passedOptions: Partial<MoonbowOptions<U, S, B>>) {
  const options = await getOptionsWithDefaults(passedOptions)
  const target = gpuCanvas(options.root, options.canvas)

  const uniforms = options.uniforms?.({ target, device: options.device, root: options.root }) || {}
  const storage = options.storage?.({ target, device: options.device, root: options.root }) || {}

  delete uniforms?.storage
  return {
    ...options,
    uniforms,
    storage,
    target
  }
}

export async function getOptionsWithDefaults<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(options: Partial<MoonbowOptions<U, S, B>>) {
  const gpu = await useGPU()
  const root = options.root || gpu.root
  const device = options.device || gpu.device

  function bindGroupFallback(bindGroup: BindGroup<U, S, B>) {
    return [bindGroup()] as const
  }

  const props = {
    uniforms: options.uniforms || (() => ({})),
    storage: options.storage || (() => ({})),
    canvas: options.canvas || null,
    device: device,
    root: root,
    model: options.model === undefined ? true : options.model,
    shader: options.shader || '',
    computeShader: options.computeShader || '',
    wireframe: options.wireframe || false,
    depthStencil: options.depthStencil || false,
    bindGroups: options.bindGroups || bindGroupFallback
  } as const

  return props as MoonbowOptions<U, S, B>
}

export type GetMemory<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> = Awaited<ReturnType<typeof getMemory<U, S, B>>>
