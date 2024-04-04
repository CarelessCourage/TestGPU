import type { GPUTarget } from './target.ts'

interface PipelineOptions {
    uniforms: UB[]
    shader: string
    layout: GPUVertexBufferLayout[]
    wireframe?: boolean
}

export interface Pipeline {
    pipeline: GPURenderPipeline
    bindGroup: GPUBindGroup
}

export function usePipeline(
    { device, canvas }: GPUTarget,
    { uniforms, shader, layout, wireframe = false }: PipelineOptions
): Pipeline {
    const entries = getEntries(device, uniforms)

    console.log(entries)

    const cellShaderModule = device.createShaderModule({
        label: 'Cell shader',
        code: shader,
    })

    const pipeline = device.createRenderPipeline({
        label: 'Cell pipeline',
        layout: device.createPipelineLayout({
            bindGroupLayouts: [entries.layout],
        }),
        vertex: {
            module: cellShaderModule,
            entryPoint: 'vertexMain',
            buffers: layout,
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: 'fragmentMain',
            targets: [{ format: canvas.format }],
        },
        primitive: {
            topology: wireframe ? 'line-list' : 'triangle-list',
            //cullMode: "back",
        },
        // depthStencil: {
        //   depthWriteEnabled: true,
        //   depthCompare: "less",
        //   format: "depth24plus-stencil8",
        // },
    })

    // This is where we attach the uniform to the shader through the pipeline
    const bindGroup = device.createBindGroup({
        label: 'Cell renderer bind group',
        layout: entries.layout, // pipeline.getBindGroupLayout(0), //@group(0) in shader
        entries: entries.bindGroup,
    })

    return {
        pipeline: pipeline,
        bindGroup: bindGroup,
    }
}

function getEntries(device: GPUDevice, uniforms: UB[]) {
    const entries = uniforms.map((uniform, index) => ({
        binding: uniform.binding === undefined ? index : uniform.binding,
        visibility:
            uniform.visibility ||
            GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' as GPUBufferBindingType },
        resource: { buffer: uniform.buffer },
    }))

    const layout = device.createBindGroupLayout({ entries })
    return {
        layout,
        bindGroup: entries,
    }
}

export function uTime({ device }: UBI) {
    let time = 0
    return uniformBuffer(
        { device },
        {
            label: 'Time Buffer',
            update: (buffer) => {
                time++
                device.queue.writeBuffer(buffer, 0, new Uint32Array([time]))
                return time
            },
        }
    )
}

export const f32 = ({ device }: UBI, value: number) =>
    uniformBuffer(
        { device },
        {
            size: 8,
            update: (buffer) =>
                device.queue.writeBuffer(buffer, 0, new Float32Array(value)),
        }
    )

export const vec3 = ({ device }: UBI, value: number) =>
    uniformBuffer(
        { device },
        {
            size: 12,
            update: (buffer) =>
                device.queue.writeBuffer(buffer, 0, new Uint32Array(value)),
        }
    )

export const vec4 = ({ device }: UBI, value: number) =>
    uniformBuffer(
        { device },
        {
            size: 16,
            update: (buffer) =>
                device.queue.writeBuffer(buffer, 0, new Uint32Array(value)),
        }
    )

interface UB {
    binding?: number
    visibility?: number
    buffer: GPUBuffer
    update: () => void
}

interface UBI {
    device: GPUDevice
}

interface UBOptions {
    label?: string
    size?: number
    binding?: number
    visibility?: number
    update: (buffer: GPUBuffer) => void
}

export function uniformBuffer({ device }: UBI, options: UBOptions): UB {
    const defaultVisibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT
    const buffer = device.createBuffer({
        label: options.label,
        size: options.size || 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    options.update(buffer)
    return {
        binding: options.binding,
        visibility: options.visibility || defaultVisibility,
        buffer: buffer,
        update: () => options.update(buffer),
    }
}
