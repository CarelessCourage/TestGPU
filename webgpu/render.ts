import type { GPUCanvas } from './target.ts'
import type { Pipeline } from './pipeline.ts'

export interface RenderOutput {
    frame: (callback: (render: Renderer) => void) => void
}

export function render(props: GPUCanvas, pipeline: Pipeline): RenderOutput {
    const depthTexture = props.device.createTexture({
        size: [props.element.width, props.element.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    function frame(callback: (render: Renderer) => void) {
        const render = initRender(props, depthTexture)
        applyPipeline(render.pass, pipeline)
        callback(render)
        submitPass(props.device, render)
    }

    return {
        frame: (callback: (render: Renderer) => void) => {
            setInterval(() => frame(callback), 1000 / 60)
        },
    }
}

interface Renderer {
    encoder: GPUCommandEncoder
    pass: GPURenderPassEncoder
}

function initRender(
    { device, context }: GPUCanvas,
    depthTexture: GPUTexture
): Renderer {
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                // @location(0), see fragment shader
                view: context.getCurrentTexture().createView(),
                loadOp: 'clear',
                clearValue: { r: 0.15, g: 0.15, b: 0.25, a: 1 },
                storeOp: 'store',
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
        },
    })
    return { encoder, pass }
}

function submitPass(device: GPUDevice, { encoder, pass }: Renderer) {
    pass.end()
    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
}

interface Object {
    vertices: GPUBuffer
    normals: GPUBuffer
    uvs: GPUBuffer
    indices: GPUBuffer
    indicesCount: number
}

export function drawObject(pass: GPURenderPassEncoder, object: Object) {
    // Set Geometry
    pass.setVertexBuffer(0, object.vertices)
    pass.setVertexBuffer(1, object.normals)
    pass.setVertexBuffer(2, object.uvs)

    // Draw Geometry
    pass.setIndexBuffer(object.indices, 'uint16')
    pass.drawIndexed(object.indicesCount, 1, 0, 0, 0)
}

export function applyPipeline(pass: GPURenderPassEncoder, pipeline: Pipeline) {
    // Pass Pipeline
    pass.setPipeline(pipeline.pipeline)
    pass.setBindGroup(0, pipeline.bindGroup)
}
