//@ts-ignore
import shader from './shader/shader.wgsl'
//@ts-ignore
import basic from './shader/basic.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { useCamera } from './camera.ts'
import { useGPU, gpuCanvas, GPUTarget } from './target.ts'
import { render, drawObject } from './render.ts'

async function moonBow() {
    const gpu = await useGPU()

    const target1 = {
        device: gpu.device,
        adapter: gpu.adapter,
        canvas: gpuCanvas(gpu.device),
    }

    const target2 = {
        device: gpu.device,
        adapter: gpu.adapter,
        canvas: gpuCanvas(
            gpu.device,
            document.querySelector('canvas#two') as HTMLCanvasElement
        ),
    }

    instance(target1, shader)
    instance(target2, basic)
}

function instance(gpu: GPUTarget, shader: string) {
    const camera = useCamera(gpu)
    const geometry = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.2, 0.05],
        position: [0, 0, 0],
    })

    const geometry2 = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.2, 0.05],
        position: [0, 1, 0],
    })

    const geometry3 = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.2, 0.05],
        position: [0, -1, 0],
    })

    const time = uTime(gpu.device)
    const intensity = f32(gpu.device, 0.01)

    const pipeline = usePipeline(gpu, {
        shader: shader,
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    render(gpu).frame(({ pass }) => {
        time.update()
        camera.update({
            position: [0, 0, 7],
            target: [0, 0, 0],
            rotation: 1,
        })
        geometry.update({
            position: [0, 0, 0],
        })
        drawObject(pass, pipeline, geometry)
        drawObject(pass, pipeline, geometry2)
        drawObject(pass, pipeline, geometry3)
    })
}

moonBow()
