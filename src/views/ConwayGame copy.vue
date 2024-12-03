<script setup lang="ts">
import { onMounted } from 'vue'
import { useGPU } from '../moonbow'
import type { MoonbowUniforms, MoonbowOptions, BindGroup, UniformBuffer } from '../moonbow'

async function getOptionsWithDefaults<
  U extends MoonbowUniforms,
  S extends MoonbowUniforms,
  B extends GPUBindGroup[] = GPUBindGroup[]
>(options: Partial<MoonbowOptions<U, S, B>>) {
  const device = options.device || (await useGPU()).device

  function bindGroupFallback(bindGroup: BindGroup<U, S, B>) {
    return [bindGroup()] as const
  }

  const props = {
    uniforms: options.uniforms || (() => ({})),
    storage: options.storage || (() => ({})),
    canvas: options.canvas || null,
    device: device,
    model: options.model === undefined ? true : options.model,
    shader: options.shader || '',
    computeShader: options.computeShader || '',
    wireframe: options.wireframe || false,
    depthStencil: options.depthStencil || false,
    bindGroups: options.bindGroups || bindGroupFallback
  } as const

  return props as MoonbowOptions<U, S, B>
}

onMounted(async () => {
  const { device } = await useGPU()

  const options = await getOptionsWithDefaults({
    device,
    canvas: document.querySelector('canvas'),
    bindGroups: (bindGroup) => {
      return [
        bindGroup(),
        bindGroup(({ uniformEntries, storageEntries }) => [
          ...uniformEntries,
          {
            binding: 1,
            resource: storageEntries[1].resource
          },
          {
            binding: 2,
            resource: storageEntries[0].resource
          }
        ])
      ] as const
    }
  })

  const testfn = () => {
    return [1, 2, 3] as const
  }

  const fnConsumer = (args: typeof testfn) => {
    console.log(args)
    return args
  }

  const layout = getBindGroupLayout(device, [])

  // This is where we attach the uniform to the shader through the pipeline
  const bindGroup = () => {
    return device.createBindGroup({
      label: 'Moonbow bindgroup',
      layout: layout,
      entries:
    })
  }

  const res = fnConsumer(testfn)

  const lol = options.bindGroups(bindGroup)
})

export function getUniformEntries(props: { device: GPUDevice; uniforms: UniformBuffer[] }) {
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
</script>

<template>
  <canvas></canvas>
</template>
