import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { plane } from './geometry/plane.ts'
import { Camera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render, passPipeline, initRender, submitPass } from './render.ts'

async function moonBow() {
    const gpu = await gpuTarget()
    const camera = new Camera()

    const box = cube(gpu)
    const panel = plane({
        device: gpu.device,
        options: {
            size: 1,
            resolution: 3,
        },
    })

    const time = uTime(gpu)
    const insensity = f32(gpu, 2.0)

    console.log(time, insensity)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        layout: panel.buffer.layout,
        wireframe: false,
        uniforms: [
            //camera.uniform(gpu.device),
            time,
            insensity,
        ],
    })

    render(1000 / 60, () => {
        time.update()
        const render = initRender(gpu)
        passPipeline(render, pipeline)

        render.pass.setVertexBuffer(0, panel.buffer.vertices)
        render.pass.setVertexBuffer(1, panel.buffer.normals)
        render.pass.setVertexBuffer(2, panel.buffer.uvs)

        render.pass.setIndexBuffer(panel.indices, 'uint16')
        render.pass.drawIndexed(panel.indicesCount, 1, 0, 0, 0)

        submitPass(gpu, render)
    })
}

moonBow()
