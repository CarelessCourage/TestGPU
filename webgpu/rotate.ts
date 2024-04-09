import { mat4, vec3, quat } from 'gl-matrix'

interface RotateOptions {
    rotation: vec3
    position: vec3
}

export class quaternion {
    public degree = 0
    public rotate(options: RotateOptions) {
        this.degree += (options.rotation[1] * Math.PI) / 180

        let quaternion = quat.create()
        quat.setAxisAngle(
            quaternion,
            vec3.fromValues(
                valueHAstoBe1or0(options.rotation[0]),
                valueHAstoBe1or0(options.rotation[1]),
                valueHAstoBe1or0(options.rotation[2])
            ),
            this.degree
        )

        let rotationMatrix = mat4.create()
        mat4.fromQuat(rotationMatrix, quaternion)

        let newPosition = vec3.create()
        vec3.transformMat4(newPosition, options.position, rotationMatrix)

        return {
            ...options,
            position: newPosition,
        }
    }
}

export function rotationSetting(value: number | [number, number, number]) {
    // If the value is a single number insead of an array then just assume they are wanting to rotate along the Y axis
    if (typeof value === 'number') return vec3.fromValues(0, value, 0)
    return vec3.fromValues(value[0], value[1], value[2])
}

function valueHAstoBe1or0(value: number) {
    return value > 0 ? 1 : 0
}
