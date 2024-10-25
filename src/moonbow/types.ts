import type { UniformBuffer, PipelineOptions, GPUCanvas } from './'

export interface MoonbowUniforms {
  [key: string]: UniformBuffer
}

export interface MoonbowOptions<U extends MoonbowUniforms>
  extends Omit<PipelineOptions, 'uniforms' | 'storage'> {
  canvas: HTMLCanvasElement | null
  model?: boolean
  memory: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  device?: GPUDevice
}
