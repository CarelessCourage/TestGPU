import { mat4, vec3 } from 'gl-matrix'
import { uniformBuffer } from './pipeline'
import { modelMatrix } from './geometry/utils'
import type { GPUTarget } from './target'
import { quaternion, rotationSetting } from './rotate'

interface CameraOptions {
    position: vec3
    target: vec3
    rotation: vec3
}

interface CameraInput {
    position: number | [number, number, number]
    target: number | [number, number, number]
    rotation: number | [number, number, number]
}

export function useCamera(gpu: GPUTarget) {
    const matrixSize = 4 * 16 // 4x4 matrix
    const offset = 256 // uniformBindGroup offset must be 256-byte aligned
    const uniformBufferSize = offset + matrixSize

    // Classes contain state
    const angle = new quaternion()
    function rotateCamera(options: CameraOptions) {
        return angle.rotate(options) as CameraOptions
    }

    function update(buffer: GPUBuffer, options?: Partial<CameraInput>) {
        const o = optionsFallback(options)
        const appliedRotation = rotateCamera(o)
        const matrix = mvpMatrix(gpu, appliedRotation)
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

    // Basically overwrites the generic update prop so we can pass in the camera options
    return {
        ...uniform,
        update: (options?: CameraInput) => update(uniform.buffer, options),
    }
}

function mvpMatrix(gpu: GPUTarget, options: CameraOptions) {
    const cameraView = cameraMatrix(gpu, options)
    const model = modelMatrix()

    const mvpMatrix = mat4.create()
    mat4.multiply(mvpMatrix, cameraView, model)
    return mvpMatrix as Float32Array
}

function cameraMatrix(gpu: GPUTarget, options: CameraOptions) {
    const position = options.position
    const target = options.target

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

const defaultCameraOptions: CameraInput = {
    position: [0, 0, 5],
    target: [0, 0, 0],
    rotation: 0,
}

function optionsFallback(options?: Partial<CameraInput>) {
    const o = options
        ? { ...defaultCameraOptions, ...options }
        : defaultCameraOptions

    const p = o.position
    if (typeof p !== 'number')
        return {
            position: vec3.fromValues(p[0], p[1], p[2]),
            target: vec3.fromValues(o.target[0], o.target[1], o.target[2]),
            rotation: rotationSetting(o.rotation),
        }
    return {
        position: vec3.fromValues(p, p, p),
        target: vec3.fromValues(o.target[0], o.target[1], o.target[2]),
        rotation: rotationSetting(o.rotation),
    }
}
