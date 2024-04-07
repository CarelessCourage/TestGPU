import type { GPUTarget } from './target.ts'

export function render(gpu: GPUTarget) {
    const canvas = gpu.canvas.element
    const depthTexture = gpu.device.createTexture({
        size: [canvas.height, canvas.width],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    function frame(callback: (render: Renderer) => void) {
        const render = initRender(gpu, depthTexture)
        callback(render)
        submitPass(gpu, render)
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

function submitPass({ device }: GPUTarget, { encoder, pass }: Renderer) {
    pass.end()
    const commandBuffer = encoder.finish()
    device.queue.submit([commandBuffer])
}
