import type { GPUTarget } from './target.ts'
import type { Pipeline } from './pipeline.ts'

export function passPipeline({ pass }: Renderer, pipeline: Pipeline) {
    pass.setPipeline(pipeline.pipeline)
    pass.setBindGroup(0, pipeline.bindGroup)
}

interface Renderer {
    encoder: GPUCommandEncoder
    pass: GPURenderPassEncoder
}

export function initRender({ device, canvas }: GPUTarget): Renderer {
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
        colorAttachments: [
            {
                // @location(0), see fragment shader
                view: canvas.context.getCurrentTexture().createView(),
                loadOp: 'clear',
                clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
                storeOp: 'store',
            },
        ],
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
