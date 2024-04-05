import { mat4, vec3 } from 'gl-matrix'
import { uniformBuffer } from '../pipeline'

export class Camera {
    public x: number = 0
    public y: number = 0
    public z: number = 0

    public rotX: number = 0
    public rotY: number = 0
    public rotZ: number = 0

    public fovy: number = (2 * Math.PI) / 5
    public aspect: number = 512 / 512 //canvas width / canvas height

    public near: number = 1
    public far: number = 1000

    public modelViewProjectionMatrix = mat4.create() as Float32Array

    constructor(aspect = 512 / 512) {
        this.aspect = aspect
    }

    public getViewMatrix(): mat4 {
        let viewMatrix = mat4.create()

        mat4.lookAt(
            viewMatrix,
            vec3.fromValues(this.x, this.y, this.z),
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 1, 0)
        )

        mat4.rotateX(viewMatrix, viewMatrix, this.rotX)
        mat4.rotateY(viewMatrix, viewMatrix, this.rotY)
        mat4.rotateZ(viewMatrix, viewMatrix, this.rotZ)
        return viewMatrix
    }

    public getProjectionMatrix(): mat4 {
        let projectionMatrix = mat4.create()
        mat4.perspective(
            projectionMatrix,
            this.fovy,
            this.aspect,
            this.near,
            this.far
        )
        return projectionMatrix
    }

    public getCameraViewProjMatrix(): mat4 {
        const viewProjMatrix = mat4.create()
        const view = this.getViewMatrix()
        const proj = this.getProjectionMatrix()
        mat4.multiply(viewProjMatrix, proj, view)
        return viewProjMatrix
    }

    private updateTransformationMatrix(cameraProjectionMatrix: mat4) {
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

    public uniform(device) {
        this.updateTransformationMatrix(this.getCameraViewProjMatrix())

        const matrixSize = 4 * 16 // 4x4 matrix
        const offset = 256 // uniformBindGroup offset must be 256-byte aligned
        const uniformBufferSize = offset + matrixSize

        const viewMatrix = uniformBuffer(
            { device },
            {
                label: 'Camera View/Projection Matrix Buffer',
                size: uniformBufferSize,
                update: (buffer) => {
                    const sourceArray = new Float32Array(
                        this.modelViewProjectionMatrix
                    )
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

        return viewMatrix
    }
}

export function getViewProjectionMatrix(gpu) {
    const position = vec3.fromValues(0, 0, 5)
    const target = vec3.fromValues(0, 0, 0)
    const up = vec3.fromValues(0, 1, 0)
    const fov = Math.PI / 4
    const aspect = window.innerWidth / window.innerHeight
    const near = 0.1
    const far = 1000.0

    const viewMatrix = mat4.create()
    mat4.lookAt(viewMatrix, position, target, up)

    const projectionMatrix = mat4.create()
    mat4.perspective(projectionMatrix, fov, aspect, near, far)

    const viewProjectionMatrix = mat4.create()
    mat4.multiply(viewProjectionMatrix, projectionMatrix, viewMatrix)

    return uniformBuffer(gpu, {
        label: 'View/Projection Matrix Buffer',
        size: 4 * 16,
        update: (buffer) => {
            const sourceArray = new Float32Array(viewProjectionMatrix)
            gpu.device.queue.writeBuffer(
                buffer,
                0,
                sourceArray.buffer,
                0,
                sourceArray.byteLength
            )
        },
    })

    return viewProjectionMatrix
}
