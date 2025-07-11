import tgpu from 'typegpu'
import * as d from 'typegpu/data'
import type { GPUCanvas } from './target'
import type { TgpuRoot } from 'typegpu'

/**
 * TypeGPU Foundation Layer
 * This provides TypeGPU integration while maintaining the existing Moonbow API
 */

export interface MoonbowFoundation {
  root: TgpuRoot
  device: GPUDevice
  canvas?: GPUCanvas
}

export async function createFoundation(options: {
  device?: GPUDevice
  canvas?: HTMLCanvasElement | null
}): Promise<MoonbowFoundation> {
  // Initialize TypeGPU root
  const root = await tgpu.init({
    device: options.device
  })

  const device = root.device

  // Set up canvas if provided
  let canvas: GPUCanvas | undefined
  if (options.canvas) {
    const context = options.canvas.getContext('webgpu')
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    if (!context) throw new Error('WebGPU context not available')

    context.configure({
      device: device,
      format: canvasFormat
    })

    canvas = {
      element: options.canvas,
      context: context,
      format: canvasFormat,
      device: device,
      aspect: options.canvas.width / options.canvas.height
    }
  }

  return {
    root,
    device,
    canvas
  }
}

/**
 * TypeGPU-based buffer creation with Moonbow-style API
 */
export function createUniformBuffer(foundation: MoonbowFoundation, schema: any, initialData?: any) {
  const buffer = foundation.root.createBuffer(schema).$usage('uniform')

  if (initialData) {
    buffer.write(initialData)
  }

  return {
    buffer,
    write: (data: any) => buffer.write(data),
    // Keep compatibility with existing API
    gpuBuffer: foundation.root.unwrap(buffer) as GPUBuffer
  }
}

/**
 * TypeGPU-based storage buffer creation
 */
export function createStorageBuffer(foundation: MoonbowFoundation, schema: any, initialData?: any) {
  const buffer = foundation.root.createBuffer(schema).$usage('storage')

  if (initialData) {
    buffer.write(initialData)
  }

  return {
    buffer,
    write: (data: any) => buffer.write(data),
    // Keep compatibility with existing API
    gpuBuffer: foundation.root.unwrap(buffer) as GPUBuffer
  }
}

/**
 * TypeGPU-based vertex buffer creation
 */
export function createVertexBuffer(foundation: MoonbowFoundation, schema: any, initialData?: any) {
  const buffer = foundation.root.createBuffer(schema).$usage('vertex')

  if (initialData) {
    buffer.write(initialData)
  }

  return {
    buffer,
    write: (data: any) => buffer.write(data),
    // Keep compatibility with existing API
    gpuBuffer: foundation.root.unwrap(buffer) as GPUBuffer
  }
}

/**
 * Common data schemas for Moonbow
 */
export const schemas = {
  // Basic types
  float: d.f32,
  vec2: d.vec2f,
  vec3: d.vec3f,
  vec4: d.vec4f,
  mat4: d.mat4x4f,

  // Common uniform structures
  time: d.struct({
    value: d.u32
  }),

  camera: d.struct({
    matrix: d.mat4x4f
  }),

  // Vertex data
  vertex: d.struct({
    position: d.vec3f,
    normal: d.vec3f,
    uv: d.vec2f
  }),

  // Array helpers
  floatArray: (length: number) => d.arrayOf(d.f32, length),
  vec3Array: (length: number) => d.arrayOf(d.vec3f, length),
  vertexArray: (length: number) =>
    d.arrayOf(
      d.struct({
        position: d.vec3f,
        normal: d.vec3f,
        uv: d.vec2f
      }),
      length
    )
}

/**
 * Bind group creation with TypeGPU
 */
export function createBindGroup(
  foundation: MoonbowFoundation,
  layout: GPUBindGroupLayout,
  entries: Array<{
    binding: number
    resource: ReturnType<typeof createUniformBuffer> | ReturnType<typeof createStorageBuffer>
  }>
) {
  const bindGroupEntries: GPUBindGroupEntry[] = entries.map((entry) => ({
    binding: entry.binding,
    resource: { buffer: entry.resource.gpuBuffer }
  }))

  return foundation.device.createBindGroup({
    layout,
    entries: bindGroupEntries
  })
}

/**
 * Helper to maintain backward compatibility with existing buffer creation
 */
export function createCompatibleBuffer(
  foundation: MoonbowFoundation,
  data: Float32Array,
  usage: 'uniform' | 'storage' | 'vertex'
) {
  // Create schema based on the data
  const schema = d.arrayOf(d.f32, data.length)

  const buffer = foundation.root.createBuffer(schema).$usage(usage)

  buffer.write(Array.from(data))

  return {
    buffer,
    gpuBuffer: foundation.root.unwrap(buffer) as GPUBuffer,
    write: (newData: Float32Array) => buffer.write(Array.from(newData))
  }
}
