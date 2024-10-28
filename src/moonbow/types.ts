import type { UniformBuffer, PipelineOptions, GPUCanvas } from './'

export interface MoonbowUniforms {
  [key: string]: UniformBuffer
}

export interface MoonbowMemory {
  [key: string]: UniformBuffer | MoonbowUniforms
}

export interface MoonbowOptions<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends PipelineOptions {
  uniforms: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  storage: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<S>
  canvas: HTMLCanvasElement | null
  device?: GPUDevice
  model?: boolean
}
