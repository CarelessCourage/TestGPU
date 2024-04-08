//@ts-ignore
import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import type { Pipeline } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import type { GeoObject } from './geometry/utils.ts'
import { useCamera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render } from './render.ts'

async function moonBow() {
    const gpu = await gpuTarget()
    const camera = useCamera(gpu)

    const box = cube(gpu, {
        resolution: 5,
    })

    const time = uTime(gpu)
    const intensity = f32(gpu, 0)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    render(gpu).frame(({ pass }) => {
        time.update()
        camera.rotate({ speed: 1, distance: 5 })
        drawObject(pass, pipeline, box)
    })
}

function drawObject(
    pass: GPURenderPassEncoder,
    pipeline: Pipeline,
    box: GeoObject
) {
    // Pass Pipeline
    pass.setPipeline(pipeline.pipeline)
    pass.setBindGroup(0, pipeline.bindGroup)

    // Set Geometry
    pass.setVertexBuffer(0, box.buffer.vertices)
    pass.setVertexBuffer(1, box.buffer.normals)
    pass.setVertexBuffer(2, box.buffer.uvs)

    // Draw Geometry
    pass.setIndexBuffer(box.indices, 'uint16')
    pass.drawIndexed(box.indicesCount, 1, 0, 0, 0)
}

moonBow()
