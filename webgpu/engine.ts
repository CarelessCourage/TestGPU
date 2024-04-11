//@ts-ignore
import shader from './shader/shader.wgsl'
//@ts-ignore
import basic from './shader/basic.wgsl'
import { getPipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { getCamera } from './camera.ts'
import { useGPU, gpuCanvas, GPU } from './target.ts'

async function moonBow() {
    const gpu = await useGPU()

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
    const intensity = f32(gpu.device, 0.1)

    let rot = 0
    function animate(pass: GPURenderPassEncoder) {
        geometry2.set(pass, { rotation: [0, rot, 0] })
        geometry.set(pass, { rotation: [0, rot - 0.4, 0] })
        geometry3.set(pass, { rotation: [0, rot - 0.8, 0] })
    }

    const scene1 = instance(
        {
            gpu,
            shader: shader,
            uniforms: { time, intensity },
            canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
        },
        animate
    )

    const scene2 = instance(
        {
            gpu,
            shader: basic,
            uniforms: { time, intensity },
            canvas: document.querySelector('canvas#two') as HTMLCanvasElement,
        },
        animate
    )

    setInterval(() => {
        rot += 0.0005
        time.update()
        scene1.draw()
        scene2.draw()
    }, 1000 / 60)
}

interface Instance {
    gpu: GPU
    canvas: HTMLCanvasElement
    shader: string
}

function instance({ uniforms, gpu, canvas, shader }, callback) {
    const target = gpuCanvas(gpu.device, canvas)
    const camera = getCamera(target)
    const pipeline = getPipeline(target, {
        shader: shader,
        uniforms: [uniforms.time, uniforms.intensity, camera],
    })

    return target.render(pipeline).scene(({ pass }) => callback(pass))
}

moonBow()
