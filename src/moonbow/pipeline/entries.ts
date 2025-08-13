import type { UniformBuffer } from '../buffers'

export function getUniformEntries(props: { device: GPUDevice; uniforms: UniformBuffer[] }) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  return props.uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: uniform.visibility || defaultVisibility,
    // Use explicit bufferType when provided (e.g. 'storage'). Fallback to 'uniform'.
    buffer: { type: (uniform.bufferType || 'uniform') as GPUBufferBindingType },
    resource: { buffer: uniform.buffer }
  }))
}

type UniformEntries = ReturnType<typeof getUniformEntries>

export function getBindGroupLayout(device: GPUDevice, entries: UniformEntries) {
  const bindGroupLayout = device.createBindGroupLayout({
    label: 'Uniforms Bind Group Layout',
    entries: entries.map((entry) => ({
      binding: entry.binding,
      visibility: entry.visibility,
      buffer: entry.buffer
    }))
  })
  return bindGroupLayout
}
