import { useGPU, gpuCanvas } from './'
import { createFoundation, type MoonbowFoundation } from './foundation'
import type { MoonbowBuffers, MoonbowOptions, BindGroup } from './'

/**
 * Enhanced memory system with TypeGPU support
 */
export interface MoonbowMemoryOptions<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> extends MoonbowOptions<U, S, B> {
  useTypeGPU?: boolean
  foundation?: MoonbowFoundation
}

/**
 * Gets a device and lets the user allocate uniform/storage buffers to the memory on it.
 * Now supports TypeGPU foundation layer.
 */
export async function getMemory<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(passedOptions: Partial<MoonbowMemoryOptions<U, S, B>>) {
  const options = await getOptionsWithDefaults(passedOptions)
  const target = gpuCanvas(options.device, options.canvas)

  // Create TypeGPU foundation if requested
  let foundation: MoonbowFoundation | undefined
  if (options.useTypeGPU || options.foundation) {
    foundation =
      options.foundation ||
      (await createFoundation({
        device: options.device,
        canvas: options.canvas
      }))
  }

  const uniforms = options.uniforms?.({ target, device: options.device, foundation }) || {}
  const storage = options.storage?.({ target, device: options.device, foundation }) || {}

  delete uniforms?.storage
  return {
    ...options,
    uniforms,
    storage,
    target,
    foundation
  }
}

export async function getOptionsWithDefaults<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(options: Partial<MoonbowMemoryOptions<U, S, B>>) {
  const device = options.device || (await useGPU()).device

  function bindGroupFallback(bindGroup: BindGroup<U, S, B>) {
    return [bindGroup()] as const
  }

  const props = {
    uniforms: options.uniforms || (() => ({})),
    storage: options.storage || (() => ({})),
    canvas: options.canvas || null,
    device: device,
    model: options.model === undefined ? true : options.model,
    shader: options.shader || '',
    computeShader: options.computeShader || '',
    wireframe: options.wireframe || false,
    depthStencil: options.depthStencil || false,
    bindGroups: options.bindGroups || bindGroupFallback,
    useTypeGPU: options.useTypeGPU || false,
    foundation: options.foundation
  } as const

  return props as MoonbowMemoryOptions<U, S, B>
}

export type GetMemory<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> = Awaited<ReturnType<typeof getMemory<U, S, B>>>

// Legacy export for backward compatibility
export { getMemory as getMemoryLegacy } from './memory'
