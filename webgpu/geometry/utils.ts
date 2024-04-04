export interface GeoObject {
    buffer: GeoBuffers
    vertexCount: number
    indicesCount: number
    indices: GPUBuffer
    set: (options?: Dim2Options) => void
}

export interface GeoBuffers {
    update: (options?: Dim2Options) => void
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
}

export function geoBuffer({ device, data }: GeoBuffer) {
    let buffer = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX,
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

export interface Dim2Options {
    size?: [number, number] | number
    resolution?: [number, number] | number
    position?: [number, number] | number
}

export function getOptions(passedOptions?: Dim2Options) {
    const options = {
        size: 2,
        resolution: 1,
        position: 0,
        ...passedOptions,
    }
    return {
        size: ensureTwoElementArray(options.size),
        resolution: ensureTwoElementArray(options.resolution),
        position: ensureTwoElementArray(options.position),
    }
}

function ensureTwoElementArray(value: number | number[]): [number, number] {
    // value could be: n, [n], [n, n]. We want to return [n, n] no matter what.
    const y = Array.isArray(value) ? value[0] : value
    const x = Array.isArray(value) ? value[1] || value[0] : value
    return [x, y]
}
