import { mat4, vec3 } from 'gl-matrix'
import { uniformBuffer } from '../pipeline'
import type { GPUTarget } from '../target'

export function useCamera(gpu: GPUTarget) {
    const matrix = mvpMatrix(gpu)

    const matrixSize = 4 * 16 // 4x4 matrix
    const offset = 256 // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset + matrixSize

    return uniformBuffer(gpu, {
        label: 'Camera View/Projection Matrix Buffer',
        size: uniformBufferSize,
        update: (buffer) => {
            gpu.device.queue.writeBuffer(
                buffer,
                0,
                matrix.buffer,
                0,
                matrix.byteLength
            )
        },
    })
}

function mvpMatrix(gpu: GPUTarget) {
    const cameraView = cameraMatrix(gpu)
    return modelMatrix(cameraView)
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

function cameraMatrix(gpu: GPUTarget) {
    const position = vec3.fromValues(5, 5, 5)
    const target = vec3.fromValues(0, 0, 0)
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
