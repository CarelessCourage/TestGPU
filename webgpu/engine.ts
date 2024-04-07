//@ts-ignore
import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { plane } from './geometry/plane.ts'
import { useCamera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render } from './render.ts'

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
    const intensity = f32(gpu, 0.01)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        layout: object.buffer.layout,
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    render(gpu).frame(({ pass }) => {
        time.update()

        // Pass Pipeline
        pass.setPipeline(pipeline.pipeline)
        pass.setBindGroup(0, pipeline.bindGroup)

        // Set Geometry
        pass.setVertexBuffer(0, object.buffer.vertices)
        pass.setVertexBuffer(1, object.buffer.normals)
        pass.setVertexBuffer(2, object.buffer.uvs)

        // Draw Geometry
        pass.setIndexBuffer(object.indices, 'uint16')
        pass.drawIndexed(object.indicesCount, 1, 0, 0, 0)
    })
}

moonBow()
