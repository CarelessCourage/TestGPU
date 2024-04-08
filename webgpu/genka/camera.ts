import { mat4, vec3 } from 'gl-matrix'
import { uniformBuffer } from '../pipeline'
import type { GPUTarget } from '../target'

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

    const uniform = uniformBuffer(gpu, {
        label: 'Camera View/Projection Matrix Buffer',
        size: uniformBufferSize,
        update: update,
    })

    let angle = 0 // Define the initial angle of rotation.
    function rotate({ speed, distance } = { speed: 1, distance: 5 }) {
        angle += (speed * Math.PI) / 180 // Increment the angle of rotation on every frame.
        let position = vec3.fromValues(distance, distance, distance) // Current position of the camera.

        // Create a rotation matrix.
        let rotationMatrix = mat4.create()
        mat4.fromRotation(rotationMatrix, angle, vec3.fromValues(0, 1, 0)) // Assuming rotation around Y-axis.

        // Apply the rotation to the camera position.
        let newPosition = vec3.create()
        vec3.transformMat4(newPosition, position, rotationMatrix)

        update(uniform.buffer, {
            position: [newPosition[0], newPosition[1], newPosition[2]],
            target: [0, 0, 0],
        })
    }

    return {
        ...uniform,
        update: (options?: CameraOptions) => update(uniform.buffer, options),
        rotate,
    }
}

function mvpMatrix(gpu: GPUTarget, options?: CameraOptions) {
    const cameraView = cameraMatrix(gpu, options)
    return modelMatrix(cameraView)
}

interface CameraOptions {
    position: number | [number, number, number]
    target: [number, number, number]
}

const defaultCameraOptions: CameraOptions = {
    position: [5, 5, 5],
    target: [0, 0, 0],
}

function cameraMatrix(gpu: GPUTarget, options?: CameraOptions) {
    const o = optionsFallback(options)
    const p = o.position
    const t = o.target

    const position = vec3.fromValues(p[0], p[1], p[2])
    const target = vec3.fromValues(t[0], t[1], t[2])
    const up = vec3.fromValues(0, 1, 0)
    const fov = Math.PI / 4 // maybe 2 instead
    const aspect = gpu.canvas.element.width / gpu.canvas.element.height
    const near = 1
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

function modelMatrix(cameraProjectionMatrix: mat4) {
    const position = vec3.fromValues(0, 0, 0)
    const rotation = vec3.fromValues(0, 0, 0)
    const scale = vec3.fromValues(1, 1, 1)

    const modelMatrix = mat4.create()

    // TRANSLATE
    mat4.translate(modelMatrix, modelMatrix, position)

    // ROTATE
    mat4.rotateX(modelMatrix, modelMatrix, rotation[0])
    mat4.rotateY(modelMatrix, modelMatrix, rotation[1])
    mat4.rotateZ(modelMatrix, modelMatrix, rotation[2])

    // SCALE
    mat4.scale(modelMatrix, modelMatrix, scale)

    const mvpMatrix = mat4.create()

    // PROJECT ON CAMERA
    mat4.multiply(mvpMatrix, cameraProjectionMatrix, modelMatrix)
    return mvpMatrix as Float32Array
}
