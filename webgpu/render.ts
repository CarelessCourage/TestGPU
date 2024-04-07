import type { GPUTarget } from './target.ts'

interface Renderer {
    encoder: GPUCommandEncoder
    pass: GPURenderPassEncoder
}

export function initRender(
    { device, canvas }: GPUTarget,
    depthTexture: GPUTexture
): Renderer {
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                // @location(0), see fragment shader
                view: canvas.context.getCurrentTexture().createView(),
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

export function submitPass({ device }: GPUTarget, { encoder, pass }: Renderer) {
    pass.end()
    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
}

export function render(interval = 1000 / 60, update: () => void) {
    setInterval(update, interval)
}
