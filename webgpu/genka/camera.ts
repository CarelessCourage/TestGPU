import { mat4, vec3 } from 'gl-matrix';
import { uniformBuffer } from '../pipeline';

export class Camera {
    public x: number = 0;
    public y: number = 0;
    public z: number = 0;

    public rotX: number = 0;
    public rotY: number = 0;
    public rotZ: number = 0;

    public fovy: number = (2 * Math.PI) / 5;
    public aspect: number = 512 / 512; //canvas width / canvas height

    public near: number = 1;
    public far: number = 1000;

    public modelViewProjectionMatrix = mat4.create() as Float32Array;

    constructor (aspect = 512 / 512) {
        this.aspect = aspect;
    }

    public getViewMatrix () : mat4 {
        let viewMatrix = mat4.create();

        mat4.lookAt(viewMatrix, vec3.fromValues(this.x, this.y, this.z), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));

        mat4.rotateX(viewMatrix, viewMatrix, this.rotX);
        mat4.rotateY(viewMatrix, viewMatrix, this.rotY);
        mat4.rotateZ(viewMatrix, viewMatrix, this.rotZ);
        return viewMatrix;
    }

    public getProjectionMatrix () : mat4 {
        let projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix, this.fovy, this.aspect, this.near, this.far);
        return projectionMatrix;
    }

    public getCameraViewProjMatrix () : mat4 {
        const viewProjMatrix = mat4.create();
        const view = this.getViewMatrix();
        const proj = this.getProjectionMatrix();
        mat4.multiply(viewProjMatrix, proj, view);
        return viewProjMatrix;
    }

    private updateTransformationMatrix(cameraProjectionMatrix: mat4) {
        // MOVE / TRANSLATE OBJECT
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, vec3.fromValues(this.x, this.y, this.z))
        mat4.rotateX(modelMatrix, modelMatrix, this.rotX);
        mat4.rotateY(modelMatrix, modelMatrix, this.rotY);
        mat4.rotateZ(modelMatrix, modelMatrix, this.rotZ);

        // PROJECT ON CAMERA
        mat4.multiply(this.modelViewProjectionMatrix, cameraProjectionMatrix, modelMatrix);
    }

    public uniform(device) {
        this.updateTransformationMatrix(this.getCameraViewProjMatrix());

        const matrixSize = 4 * 16; // 4x4 matrix
        const offset = 256; // uniformBindGroup offset must be 256-byte aligned
        const uniformBufferSize = offset + matrixSize;

        const viewMatrix = uniformBuffer({device}, {
            label: 'Camera View/Projection Matrix Buffer',
            size: uniformBufferSize,
            update: (buffer) =>  device.queue.writeBuffer(
                buffer,
                0,
                this.modelViewProjectionMatrix.buffer,
                this.modelViewProjectionMatrix.byteOffset,
                this.modelViewProjectionMatrix.byteLength
            )
          });

        return viewMatrix;
    }
}