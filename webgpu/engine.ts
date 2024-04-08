//@ts-ignore
import shader from './shader/shader.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { useCamera } from './genka/camera.ts'
import { gpuTarget } from './target.ts'
import { render, drawObject } from './render.ts'

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
        uniforms: [time, intensity, camera],
    })

    render(gpu).frame(({ pass }) => {
        time.update()
        camera.rotate({ speed: 1, distance: 5 })
        drawObject(pass, pipeline, box)
    })
}

moonBow()
