import { mat4, vec3, quat } from 'gl-matrix'
import { uniformBuffer } from './pipeline'
import { modelMatrix } from './geometry/utils'
import type { GPUTarget } from './target'

export function useCamera(gpu: GPUTarget) {
    const matrixSize = 4 * 16 // 4x4 matrix
    const offset = 256 // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset + matrixSize

    function update(buffer: GPUBuffer, options?: CameraOptions) {
        const matrix = mvpMatrix(gpu, options)
        gpu.device.queue.writeBuffer(
            buffer,
            0,
            matrix.buffer,
            0,
            matrix.byteLength
        )
    }

    const uniform = uniformBuffer(gpu.device, {
        label: 'Camera View/Projection Matrix Buffer',
        size: uniformBufferSize,
        update: update,
    })

    const rot = rotate()

    function rotateY({ speed } = { speed: 1 }) {
        const newPosition = rot.matrix({ speed })
        update(uniform.buffer, {
            position: [newPosition[0], newPosition[1], newPosition[2]],
            target: [0, 0, 0],
        })
    }

    return {
        ...uniform,
        update: (options?: CameraOptions) => update(uniform.buffer, options),
        rotate: rotateY,
    }
}

function rotate() {
    let angle = 0 // Define the initial angle of rotation.
    function matrix({ speed } = { speed: 1 }) {
        angle += (speed * Math.PI) / 180 // Increment the angle of rotation on every frame.
        let position = vec3.fromValues(0, 0, 5) // Current position of the camera.

        // Create a quaternion to represent the rotation.
        let quaternion = quat.create()
        quat.setAxisAngle(quaternion, vec3.fromValues(1, 0, 0), angle) // Set the rotation around the X-axis.

        // Convert the quaternion to a rotation matrix.
        let rotationMatrix = mat4.create()
        mat4.fromQuat(rotationMatrix, quaternion)

        // Apply the rotation to the camera position.
        let newPosition = vec3.create()
        vec3.transformMat4(newPosition, position, rotationMatrix)

        return newPosition
    }

    return { matrix }
}

function mvpMatrix(gpu: GPUTarget, options?: CameraOptions) {
    const cameraView = cameraMatrix(gpu, options)
    const model = modelMatrix()

    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix, cameraView, model)
    return mvpMatrix as Float32Array
}

interface CameraOptions {
    position: number | [number, number, number]
    target: [number, number, number]
}

const defaultCameraOptions: CameraOptions = {
    position: [0, 0, 5],
    target: [0, 0, 0],
}

function cameraMatrix(gpu: GPUTarget, options?: CameraOptions) {
    console.log('cameraMatrix', options)

    const o = optionsFallback(options)
    const p = o.position
    const t = o.target

    const position = vec3.fromValues(p[0], p[1], p[2])
    const target = vec3.fromValues(t[0], t[1], t[2])
    const up = vec3.fromValues(0, 1, 0)
    const fov = Math.PI / 4 // maybe 2 instead
    const aspect = gpu.canvas.element.width / gpu.canvas.element.height
    const near = 0.1
    const far = 1000.0

    const viewMatrix = mat4.create()
    mat4.lookAt(viewMatrix, position, target, up)

    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, fov, aspect, near, far)

    const viewProjectionMatrix = mat4.create()
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix)
    return viewProjectionMatrix as Float32Array
}

function optionsFallback(options?: CameraOptions) {
    const o = options
        ? { ...defaultCameraOptions, ...options }
        : defaultCameraOptions
    const p = o.position
    if (typeof p !== 'number') return o
    return {
        position: [p, p, p],
        target: o.target,
    }
}
