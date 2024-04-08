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
        scale: [1, 0.2, 0.05],
        position: [0, 0, 0],
    })

    const geometry2 = cube(gpu, {
        resolution: 15,
        scale: [1, 0.2, 0.05],
        position: [0, 1, 0],
    })

    const geometry3 = cube(gpu, {
        resolution: 15,
        scale: [1, 0.2, 0.05],
        position: [0, -1, 0],
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
        drawObject(pass, pipeline, geometry2)
        drawObject(pass, pipeline, geometry3)
    })
}

moonBow()
