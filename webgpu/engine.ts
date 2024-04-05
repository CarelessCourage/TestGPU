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
    //const camera = new Camera()

    //const box = cube(gpu)
    const panel = plane({
        device: gpu.device,
        options: {
            size: 0.8,
            resolution: 1,
        },
    })

    const time = uTime(gpu)
    const time2 = uTime(gpu)
    const insensity = f32(gpu, 1000.0)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        layout: panel.buffer.layout,
        wireframe: false,
        uniforms: [insensity, time, time2],
    })

    render(1000 / 60, () => {
        time.update()
        time2.update()
        const render = initRender(gpu)

        // Pass Pipeline
        render.pass.setPipeline(pipeline.pipeline)
        render.pass.setBindGroup(0, pipeline.bindGroup)

        // Set Geometry
        render.pass.setVertexBuffer(0, panel.buffer.vertices)
        render.pass.setVertexBuffer(1, panel.buffer.normals)
        render.pass.setVertexBuffer(2, panel.buffer.uvs)

        // Draw Geometry
        render.pass.setIndexBuffer(panel.indices, 'uint16')
        render.pass.drawIndexed(panel.indicesCount, 1, 0, 0, 0)

        submitPass(gpu, render)
    })
}

moonBow()
