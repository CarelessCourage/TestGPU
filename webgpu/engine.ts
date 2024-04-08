//@ts-ignore
import shader from './shader/shader.wgsl'
//@ts-ignore
import basic from './shader/basic.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { useCamera } from './camera.ts'
import { gpuTarget, gpuDevice, gpuCanvas, GPUTarget } from './target.ts'
import { render, drawObject } from './render.ts'

async function moonBow() {
    //const gpu = await gpuTarget()
    const target = await gpuDevice()

    const gpu1 = {
        device: target.device,
        adapter: target.adapter,
        canvas: gpuCanvas(target.device),
    }

    const gpu2 = {
        device: target.device,
        adapter: target.adapter,
        canvas: gpuCanvas(
            target.device,
            document.querySelector('canvas#two') as HTMLCanvasElement
        ),
    }

    instance(gpu1, shader)
    instance(gpu2, basic)
}

function instance(gpu: GPUTarget, shader: string) {
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
    const intensity = f32(gpu, 0.01)

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
