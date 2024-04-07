import { mat4, vec3 } from 'gl-matrix'
import { uniformBuffer } from '../pipeline'
import type { UBI } from '../pipeline'

export function useCamera(gpu: UBI) {
    const viewProjection = getViewProjectionMatrix()

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
                viewProjection.buffer,
                0,
                viewProjection.byteLength
            )
        },
    })
}

export class Camera {
    public uniform(device) {
        getViewProjectionMatrix()

        const matrixSize = 4 * 16 // 4x4 matrix
        const offset = 256 // uniformBindGroup offset must be 256-byte aligned
        const uniformBufferSize = offset + matrixSize

        return uniformBuffer(
            { device },
            {
                label: 'Camera View/Projection Matrix Buffer',
                size: uniformBufferSize,
                update: (buffer) => {
                    const sourceArray = getViewProjectionMatrix()
                    device.queue.writeBuffer(
                        buffer,
                        0,
                        sourceArray.buffer,
                        0,
                        sourceArray.byteLength
                    )
                },
            }
        )
    }
}

function updateTransformationMatrix(cameraProjectionMatrix: mat4) {
    // MOVE / TRANSLATE OBJECT
    const modelMatrix = mat4.create()
    mat4.translate(
        modelMatrix,
        modelMatrix,
        vec3.fromValues(this.x, this.y, this.z)
    )
    mat4.rotateX(modelMatrix, modelMatrix, this.rotX)
    mat4.rotateY(modelMatrix, modelMatrix, this.rotY)
    mat4.rotateZ(modelMatrix, modelMatrix, this.rotZ)

    // PROJECT ON CAMERA
    mat4.multiply(
        this.modelViewProjectionMatrix,
        cameraProjectionMatrix,
        modelMatrix
    )
}

function getViewProjectionMatrix() {
    const position = vec3.fromValues(5, 5, 5)
    const target = vec3.fromValues(0, 0, 0)
    const up = vec3.fromValues(0, 1, 0)
    const fov = Math.PI / 4
    const aspect = 512 / 512
    const near = 0
    const far = 1000.0

    const viewMatrix = mat4.create()
    mat4.lookAt(viewMatrix, position, target, up)

    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, fov, aspect, near, far)

    const viewProjectionMatrix = mat4.create()
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix)

    return viewProjectionMatrix as Float32Array
}
