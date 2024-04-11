//@ts-ignore
import shader from './shader/shader.wgsl'
//@ts-ignore
import basic from './shader/basic.wgsl'
import { gpuPipeline, uTime, f32 } from './pipeline.ts'
import { cube } from './geometry/box.ts'
import { gpuCamera } from './camera.ts'
import { useGPU, gpuCanvas } from './target.ts'

function spinningPlanks(device) {
    const resolution = 15
    const size: [number, number, number] = [1, 1 / 4, 0.05]

    const topPlank = cube(device, {
        size,
        resolution,
        position: [0, 1, 0],
    })

    const middlePlank = cube(device, {
        size,
        resolution,
        position: [0, 0, 0],
    })

    const bottomPlank = cube(device, {
        size,
        resolution,
        position: [0, -1, 0],
    })

    function render(pass: GPURenderPassEncoder, rotation: number) {
        topPlank.set(pass, { rotation: [0, rotation, 0] })
        middlePlank.set(pass, { rotation: [0, rotation - 0.4, 0] })
        bottomPlank.set(pass, { rotation: [0, rotation - 0.8, 0] })
    }

    return { render }
}

async function moonBow() {
    const { device } = await useGPU()

    const time = uTime(device)
    const intensity = f32(device, 0.1)
    const model = spinningPlanks(device)

    const scene1 = instance(device, {
        shader: shader,
        uniforms: { time, intensity },
        canvas: document.querySelector('canvas#one') as HTMLCanvasElement,
    })

    const scene2 = instance(device, {
        shader: basic,
        uniforms: { time, intensity },
        canvas: document.querySelector('canvas#two') as HTMLCanvasElement,
    })

    let rotation = 0
    setInterval(() => {
        rotation += 0.05
        time.update()
        scene1.draw(({ pass }) => model.render(pass, rotation))
        scene2.draw(({ pass }) => model.render(pass, rotation))
    }, 1000 / 60)
}

function instance(device, { uniforms, canvas, shader }) {
    const target = gpuCanvas(device, canvas)
    const camera = gpuCamera(target)
    const pipeline = gpuPipeline(target, {
        shader: shader,
        uniforms: [uniforms.time, uniforms.intensity, camera],
    })

    return target.render(pipeline)
}

moonBow()
