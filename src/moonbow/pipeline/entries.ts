import type { UB } from '../buffers'

export function getUniformEntries(props: { device: GPUDevice; uniforms: UB[] }) {
  const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
  return props.uniforms.map((uniform, index) => ({
    binding: uniform.binding === undefined ? index : uniform.binding,
    visibility: uniform.visibility || defaultVisibility,
    buffer: { type: uniform.bufferType || ('uniform' as GPUBufferBindingType) },
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
