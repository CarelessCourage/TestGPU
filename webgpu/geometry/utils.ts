import { mat4, vec3 } from 'gl-matrix'
import { ensure3Values } from './box'
export interface GeoObject {
    buffer: GeoBuffers
    vertexCount: number
    indicesCount: number
    indices: GPUBuffer
    update: (options: ModelOptions) => void
    geometry: Geometry
}

export interface GeoBuffers {
    update: (options: ModelOptions) => void
    vertices: GPUBuffer
    normals: GPUBuffer
    uvs: GPUBuffer
    layout: GPUVertexBufferLayout[]
}

export interface Geometry {
    vertices: Float32Array
    indices: Uint16Array
    colors: Float32Array
    normals: Float32Array
    uvs: Float32Array
}

interface GeoBuffer {
    device: GPUDevice
    data: Float32Array
    label?: string
}

export function geoBuffer({ device, data, label }: GeoBuffer) {
    let buffer = device.createBuffer({
        label,
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    })
    new Float32Array(buffer.getMappedRange()).set(data)

    buffer.unmap()
    return buffer
}

interface IndicesBuffer {
    device: GPUDevice
    indices: Uint16Array
}

export function indicesBuffer({ device, indices }: IndicesBuffer) {
    const buffer = device.createBuffer({
        label: 'Plane Indices Buffer',
        size: indices.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(buffer, 0, indices)
    return buffer
}

export function bufferLayout(): [
    GPUVertexBufferLayout,
    GPUVertexBufferLayout,
    GPUVertexBufferLayout
] {
    let vertexLayout: GPUVertexBufferLayout = {
        arrayStride: 3 * 4,
        attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }],
    }
    let normalLayout: GPUVertexBufferLayout = {
        arrayStride: 3 * 4,
        attributes: [{ shaderLocation: 1, offset: 0, format: 'float32x3' }],
    }
    let uvLayout: GPUVertexBufferLayout = {
        arrayStride: 2 * 4,
        attributes: [{ shaderLocation: 2, offset: 0, format: 'float32x2' }],
    }
    return [vertexLayout, normalLayout, uvLayout]
}

export interface ModelOptions {
    position?: number | [number, number, number]
    rotation?: number | [number, number, number]
    size?: number | [number, number, number]
    resolution?: number | [number, number, number]
}

function handleOptions(options?: ModelOptions) {
    const position = ensure3Values(options?.position ?? 0)
    const rotation = ensure3Values(options?.rotation ?? 0)
    const scale = ensure3Values(options?.size ?? 1)
    return {
        position: vec3.fromValues(...position),
        rotation: vec3.fromValues(...rotation),
        scale: vec3.fromValues(...scale),
    }
}

export function modelMatrix(options?: ModelOptions) {
    const { position, rotation, scale } = handleOptions(options)
    const modelMatrix = mat4.create()

    // TRANSLATE
    mat4.translate(modelMatrix, modelMatrix, position)

    // ROTATE
    mat4.rotateX(modelMatrix, modelMatrix, rotation[0])
    mat4.rotateY(modelMatrix, modelMatrix, rotation[1])
    mat4.rotateZ(modelMatrix, modelMatrix, rotation[2])

    // SCALE
    mat4.scale(modelMatrix, modelMatrix, scale)

    return modelMatrix
}
