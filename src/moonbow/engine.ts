import { gpuPipeline } from './pipeline.js'
import { gpuCamera } from './camera.js'
import { gpuCanvas } from './target.js'

export function instance(device, { uniforms, canvas, shader }) {
  const target = gpuCanvas(device, canvas)
  const camera = gpuCamera(target)
  const pipeline = gpuPipeline(target, {
    shader: shader,
    wireframe: false,
    uniforms: [uniforms.time, uniforms.intensity, camera]
  })
  return target.render(pipeline)
}
