import { uniformBuffer } from '.'

export function uTime(device: GPUDevice, speed = 0.1) {
  let time = 50
  return uniformBuffer(device, {
    label: 'Time Buffer',
    binding: undefined,
    update: (buffer) => {
      time += speed
      device.queue.writeBuffer(buffer, 0, new Uint32Array([time]))
      return time
    }
  })
}

export function fTime(device: GPUDevice) {
  let time = 50
  return uniformBuffer(device, {
    label: 'Time Buffer',
    binding: undefined,
    update: (buffer) => {
      time += 0.02
      device.queue.writeBuffer(buffer, 0, new Float32Array([time]))
      return time
    }
  })
}

export function float(device: GPUDevice, value: number[]) {
  const data = new Float32Array(value)
  return uniformBuffer(device, {
    size: data.byteLength,
    binding: undefined,
    update: (buffer) => {
      device.queue.writeBuffer(buffer, 0, data)
    }
  })
}

export const vec3 = (device: GPUDevice, value: number) =>
  uniformBuffer(device, {
    size: 12,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, new Uint32Array([value]))
  })

export const vec4 = (device: GPUDevice, value: number) =>
  uniformBuffer(device, {
    size: 16,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, new Uint32Array([value]))
  })
