//@ts-ignore
import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { useCamera } from './camera.ts'
import { gpuTarget } from './target.ts'
import { render, drawObject } from './render.ts'

async function moonBow() {
    const gpu = await gpuTarget()
    const camera = useCamera(gpu)
    const geometry = cube(gpu, {
        resolution: 15,
    })

    const time = uTime(gpu)
    const intensity = f32(gpu, 0.001)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    render(gpu).frame(({ pass }) => {
        time.update()
        camera.rotate({ speed: 0.2, distance: 5 })
        drawObject(pass, pipeline, geometry)
    })
}

moonBow()
