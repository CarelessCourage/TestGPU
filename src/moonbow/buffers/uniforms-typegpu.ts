import { uniformBuffer } from '.'
import { createFoundation, createUniformBuffer, schemas } from '../foundation'

// Legacy API - maintains backward compatibility
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

// New TypeGPU-based API
export async function createMoonbowUniforms(options: {
  device?: GPUDevice
  canvas?: HTMLCanvasElement | null
}) {
  const foundation = await createFoundation(options)

  return {
    foundation,

    // TypeGPU-based uniform creators
    uTime: (speed = 0.1) => {
      let time = 50
      const buffer = createUniformBuffer(foundation, schemas.time, { value: time })

      return {
        ...buffer,
        update: () => {
          time += speed
          buffer.write({ value: time })
          return time
        }
      }
    },

    fTime: () => {
      let time = 50
      const buffer = createUniformBuffer(foundation, schemas.float, time)

      return {
        ...buffer,
        update: () => {
          time += 0.02
          buffer.write(time)
          return time
        }
      }
    },

    float: (value: number[]) => {
      const schema = schemas.floatArray(value.length)
      return createUniformBuffer(foundation, schema, value)
    },

    vec3: (value: [number, number, number]) => {
      return createUniformBuffer(foundation, schemas.vec3, value)
    },

    vec4: (value: [number, number, number, number]) => {
      return createUniformBuffer(foundation, schemas.vec4, value)
    }
  }
}
