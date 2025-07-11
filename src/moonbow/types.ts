import type { UniformBuffer, GPUCanvas, BindGroups } from './'
import type { TgpuRoot } from 'typegpu'

export interface MoonbowBuffers {
  [key: string]: UniformBuffer
}

export interface MoonbowMemory {
  [key: string]: MoonbowBuffers[] | MoonbowBuffers
}

export interface MoonbowPipelineOptions {
  model: boolean
  wireframe: boolean
  depthStencil?: boolean | GPUDepthStencilState
  computeShader?: string
  shader: string
}

export interface MoonbowOptions<
  U extends MoonbowBuffers,
  S extends MoonbowBuffers,
  B extends GPUBindGroup[] = GPUBindGroup[]
> extends MoonbowPipelineOptions {
  uniforms: (props: { target: GPUCanvas; device: GPUDevice; root: TgpuRoot }) => Partial<U>
  storage: (props: { target: GPUCanvas; device: GPUDevice; root: TgpuRoot }) => Partial<S>
  bindGroups: BindGroups<U, S, B>
  canvas: HTMLCanvasElement | null
  device: GPUDevice
  root: TgpuRoot
}
