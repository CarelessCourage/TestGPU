import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.js'
import { cube } from './geometry/box.ts'
import { plane } from './geometry/plane.ts'
import { Camera } from './genka/camera.ts'
import { gpuTarget } from './target.js'
import { render, passPipeline, initRender, submitPass } from './render.js'

async function moonBow() {
    const gpu = await gpuTarget()
    //const { viewBuffer, projectionBuffer } = camera({device: gpu.device});
    const camera = new Camera()

    const box = cube(gpu)
    const plane = planeBuffer(gpu)

    console.log({
        box,
        //plane
    })

    const time = uTime(gpu)
    //const insensity = f32(gpu, 0.5);

    const pipeline = usePipeline(gpu, {
        shader: shader,
        layout: box.buffer.layout,
        wireframe: false,
        uniforms: [
            camera.uniform(gpu.device),
            time,
            //insensity,
        ],
    })

    render(1000 / 60, () => {
        const render = initRender(gpu)
        passPipeline(render, pipeline)

        //box.set({rotation: [sinTime, 0, sinTime]});

        render.pass.setVertexBuffer(0, box.buffer.vertices)
        render.pass.setVertexBuffer(1, box.buffer.normals)
        render.pass.setVertexBuffer(2, box.buffer.uvs)

        render.pass.setIndexBuffer(box.indices, 'uint16')
        render.pass.drawIndexed(box.indicesCount, 1, 0, 0, 0)

        submitPass(gpu, render)
    })
}

moonBow()
