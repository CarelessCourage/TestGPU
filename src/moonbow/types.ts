import type { UniformBuffer, PipelineOptions, GPUCanvas } from './'

export interface MoonbowUniforms {
  [key: string]: UniformBuffer
}

export interface MoonbowMemory {
  [key: string]: UniformBuffer | MoonbowUniforms
}

export interface MoonbowOptions<U extends MoonbowUniforms> extends PipelineOptions {
  memory: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  canvas: HTMLCanvasElement | null
  device?: GPUDevice
  model?: boolean
}
