import { gpuPipeline } from './pipeline.ts'
import { gpuCamera } from './camera.ts'
import { gpuCanvas } from './target.ts'

export function instance(device, { uniforms, canvas, shader }) {
    const target = gpuCanvas(device, canvas)
    const camera = gpuCamera(target)
    const pipeline = gpuPipeline(target, {
        shader: shader,
        uniforms: [uniforms.time, uniforms.intensity, camera],
    })
    return target.render(pipeline)
}
