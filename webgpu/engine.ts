//@ts-ignore
import shader from './shader/shader.wgsl'
//@ts-ignore
import basic from './shader/basic.wgsl'
import { usePipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { useCamera } from './camera.ts'
import { useGPU, gpuCanvas, GPU } from './target.ts'
import { render, drawObject } from './render.ts'

async function moonBow() {
    const gpu = await useGPU()

    instance({
        gpu: gpu,
        canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
        shader: shader,
    })

    instance({
        gpu: gpu,
        canvas: document.querySelector('canvas#two') as HTMLCanvasElement,
        shader: basic,
    })
}

interface Instance {
    gpu: GPU
    canvas: HTMLCanvasElement
    shader: string
}

function instance({ gpu, canvas, shader }: Instance) {
    const target = gpuCanvas(gpu.device, canvas)
    const camera = useCamera(target)

    const geometry = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.335, 0.05],
        position: [0, 0, 0],
    })

    const geometry2 = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.335, 0.05],
        position: [0, 1, 0],
    })

    const geometry3 = cube({
        device: gpu.device,
        resolution: 15,
        size: [1, 0.335, 0.05],
        position: [0, -1, 0],
    })

    const time = uTime(gpu.device)
    const intensity = f32(gpu.device, 0.01)

    // Can we package the pipeline and the render function togheter in a way that also lets us decouple them
    const pipeline = usePipeline(target, {
        shader: shader,
        wireframe: false,
        uniforms: [time, intensity, camera],
    })

    // Need to figure out how to decouple when frame is rendered

    let rot = 0

    // Either pipeline.render, or target.render
    render(target, pipeline).frame(({ pass }) => {
        time.update()
        rot += 0.05
        camera.update({
            position: [0, 0, 7],
            target: [0, 0, 0],
            rotation: [0, 0, 0],
        })

        geometry2.set(pass, {
            rotation: [0, rot, 0],
        })

        geometry.set(pass, {
            rotation: [0, rot - 0.4, 0],
        })

        geometry3.set(pass, {
            rotation: [0, rot - 0.8, 0],
        })
    })
}

moonBow()
