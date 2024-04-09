import type { GPUCanvas } from './target.ts'
import type { Pipeline } from './pipeline.ts'
import type { GeoObject } from './geometry/utils.ts'

export function render(props: GPUCanvas) {
    const depthTexture = props.device.createTexture({
        size: [props.element.width, props.element.height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    function frame(callback: (render: Renderer) => void) {
        const render = initRender(props, depthTexture)
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

export function drawObject(
    pass: GPURenderPassEncoder,
    pipeline: Pipeline,
    box: GeoObject
) {
    // Pass Pipeline
    pass.setPipeline(pipeline.pipeline)
    pass.setBindGroup(0, pipeline.bindGroup)

    // Set Geometry
    pass.setVertexBuffer(0, box.buffer.vertices)
    pass.setVertexBuffer(1, box.buffer.normals)
    pass.setVertexBuffer(2, box.buffer.uvs)

    // Draw Geometry
    pass.setIndexBuffer(box.indices, 'uint16')
    pass.drawIndexed(box.indicesCount, 1, 0, 0, 0)
}
