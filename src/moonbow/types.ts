import type { UniformBuffer, GPUCanvas } from './'

export interface MoonbowUniforms {
  [key: string]: UniformBuffer
}

export interface MoonbowMemory {
  [key: string]: MoonbowUniforms[] | MoonbowUniforms
}

export interface MoonbowPipelineOptions {
  model: boolean
  wireframe: boolean
  depthStencil?: boolean | GPUDepthStencilState
  computeShader?: string
  shader: string
}

export interface MoonbowOptions<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends MoonbowPipelineOptions {
  uniforms: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  storage: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<S>
  canvas: HTMLCanvasElement | null
  device: GPUDevice
}
