//@ts-ignore
import shader from './shader/basic.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { plane } from './geometry/plane.ts'
import { useCamera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render, initRender, submitPass } from './render.ts'

async function moonBow() {
    const gpu = await gpuTarget()
    const camera = useCamera(gpu)

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
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    const depthTexture = gpu.device.createTexture({
        size: [512, 512],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })

    render(1000 / 60, () => {
        time.update()
        const render = initRender(gpu, depthTexture)

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
