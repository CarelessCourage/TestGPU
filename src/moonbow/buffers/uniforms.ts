import { uniformBuffer } from './'
import type { TgpuRoot } from 'typegpu'

export function uTime(root: TgpuRoot, speed = 0.1, binding = 0) {
  let time = 50
  // For now, use the legacy approach with proper binding
  return uniformBuffer(root.device, {
    label: 'Time Buffer',
    binding: binding,
    update: (buffer) => {
      time += speed
      root.device.queue.writeBuffer(buffer, 0, new Uint32Array([time]))
      return time
    }
  })
}

export function fTime(root: TgpuRoot, speed = 0.02, binding = 1) {
  let time = 50
  return uniformBuffer(root.device, {
    label: 'Time Buffer',
    binding: binding,
    update: (buffer) => {
      time += speed
      root.device.queue.writeBuffer(buffer, 0, new Float32Array([time]))
      return time
    }
  })
}

export function float(root: TgpuRoot, value: number[], binding = 2) {
  const data = new Float32Array(value)
  return uniformBuffer(root.device, {
    size: data.byteLength,
    binding: binding,
    update: (buffer) => {
      root.device.queue.writeBuffer(buffer, 0, data)
    }
  })
}

export const vec3 = (root: TgpuRoot, value: [number, number, number], binding = 3) =>
  uniformBuffer(root.device, {
    size: 12,
    binding: binding,
    update: (buffer) => root.device.queue.writeBuffer(buffer, 0, new Float32Array(value))
  })

export const vec4 = (root: TgpuRoot, value: [number, number, number, number], binding = 4) =>
  uniformBuffer(root.device, {
    size: 16,
    binding: binding,
    update: (buffer) => root.device.queue.writeBuffer(buffer, 0, new Float32Array(value))
  })
