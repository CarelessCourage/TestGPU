//@ts-ignore
import shader from './shader/shader.wgsl'
import { vec3, mat4 } from 'gl-matrix'
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

    let angle = 0 // Define the initial angle of rotation.

    render(gpu).frame(({ pass }) => {
        angle += Math.PI / 180 // Increment the angle of rotation on every frame.

        let position = vec3.fromValues(5, 5, 5) // Current position of the camera.

        // Create a rotation matrix.
        let rotationMatrix = mat4.create()
        mat4.fromRotation(rotationMatrix, angle, vec3.fromValues(0, 1, 0)) // Assuming rotation around Y-axis.

        // Apply the rotation to the camera position.
        let newPosition = vec3.create()
        vec3.transformMat4(newPosition, position, rotationMatrix)

        // Update the camera position with the new position.
        camera.update({
            position: [newPosition[0], newPosition[1], newPosition[2]],
            target: [0, 0, 0],
        })

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
