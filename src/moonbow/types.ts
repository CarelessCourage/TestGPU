import type { UniformBuffer, GPUCanvas, BindGroups } from './'

export interface MoonbowUniforms {
  [key: string]: UniformBuffer
}

export interface MoonbowMemory {
  [key: string]: MoonbowUniforms[] | MoonbowUniforms
}

export interface MoonbowPipelineOptions<U extends MoonbowUniforms, S extends MoonbowUniforms> {
  model: boolean
  wireframe: boolean
  depthStencil?: boolean | GPUDepthStencilState
  computeShader?: string
  bindGroups: BindGroups<U, S>
  shader: string
}

export interface MoonbowOptions<U extends MoonbowUniforms, S extends MoonbowUniforms>
  extends MoonbowPipelineOptions<U, S> {
  uniforms: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<U>
  storage: (props: { target: GPUCanvas; device: GPUDevice }) => Partial<S>
  canvas: HTMLCanvasElement | null
  device: GPUDevice
}
