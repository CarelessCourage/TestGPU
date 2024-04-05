//@ts-ignore
import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { plane } from './geometry/plane.ts'
import { Camera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render, initRender, submitPass } from './render.ts'

async function moonBow() {
    const gpu = await gpuTarget()
    const camera = new Camera()

    const box = cube(gpu)
    // const panel = plane({
    //     device: gpu.device,
    //     options: {
    //         size: 0.8,
    //         resolution: 1,
    //     },
    // })

    const object = box

    const time = uTime(gpu)
    const intensity = f32(gpu, 1.0)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        layout: object.buffer.layout,
        wireframe: true,
        uniforms: [time, intensity, camera.uniform(gpu.device)],
    })

    render(1000 / 60, () => {
        time.update()
        const render = initRender(gpu)

        // Pass Pipeline
        render.pass.setPipeline(pipeline.pipeline)
        render.pass.setBindGroup(0, pipeline.bindGroup)

        // Set Geometry
        render.pass.setVertexBuffer(0, object.buffer.vertices)
        render.pass.setVertexBuffer(1, object.buffer.normals)
        render.pass.setVertexBuffer(2, object.buffer.uvs)

        // Draw Geometry
        render.pass.setIndexBuffer(object.indices, 'uint16')
        render.pass.drawIndexed(object.indicesCount, 1, 0, 0, 0)

        submitPass(gpu, render)
    })
}

moonBow()
