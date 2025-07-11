import { createFoundation, type MoonbowFoundation } from '../foundation'
import type { UniformBuffer } from '../buffers'
import * as d from 'typegpu/data'

/**
 * TypeGPU-compatible uniform buffer that works with existing Moonbow pipeline
 */
export function createMoonbowCompatibleBuffer(
  foundation: MoonbowFoundation,
  schema: any,
  initialData?: any,
  updateCallback?: (data: any) => any
): UniformBuffer {
  const tgpuBuffer = foundation.root
    .createBuffer(schema)
    .$usage('uniform')

  if (initialData) {
    tgpuBuffer.write(initialData)
  }

  const gpuBuffer = foundation.root.unwrap(tgpuBuffer) as GPUBuffer

  return {
    buffer: gpuBuffer,
    update: () => {
      if (updateCallback) {
        const newData = updateCallback(initialData)
        tgpuBuffer.write(newData)
      }
    },
    binding: 0,
    visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
  }
}

/**
 * TypeGPU-based uniform creators that return Moonbow-compatible buffers
 */
export async function createCompatibleUniforms(options: {
  device?: GPUDevice
  canvas?: HTMLCanvasElement | null
}) {
  const foundation = await createFoundation(options)
  
  return {
    foundation,
    
    // Compatible uniform creators
    uTime: (speed = 0.1) => {
      let time = 50
      const timeBuffer = createMoonbowCompatibleBuffer(
        foundation, 
        d.struct({ value: d.u32 }), 
        { value: time },
        () => {
          time += speed
          return { value: time }
        }
      )
      
      return timeBuffer
    },
    
    float: (value: number[]) => {
      const schema = d.arrayOf(d.f32, value.length)
      return createMoonbowCompatibleBuffer(foundation, schema, value)
    },
    
    vec3: (value: [number, number, number]) => {
      return createMoonbowCompatibleBuffer(foundation, d.vec3f, value)
    },
    
    vec4: (value: [number, number, number, number]) => {
      return createMoonbowCompatibleBuffer(foundation, d.vec4f, value)
    }
  }
}
