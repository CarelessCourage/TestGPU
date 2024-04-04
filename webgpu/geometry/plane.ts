import { geoBuffer, bufferLayout, indicesBuffer, getOptions } from './utils.ts'

export function plane({ device, options }) {
    const geo = geoplane(options)
    const buffer = planeBuffer({ device }, options)
    return {
        buffer,
        vertexCount: geo.vertices.length,
        indicesCount: geo.indices.length,
        indices: indicesBuffer({ device, indices: geo.indices }),
        set: (options) => buffer.update(options),
    }
}

function planeBuffer({ device }, passedOptions) {
    const options = getOptions(passedOptions)

    const geo = geoplane(options)
    const vertices = new Float32Array(geo.vertices)
    const indices = new Uint16Array(geo.indices)

    const v = verticesBuffer(device, vertices) // Figure out something prettier for this that lets me update the geometry

    function update(passedOptions) {
        const options = getOptions(passedOptions)
        const geo = geoplane(options)
        const vertices = new Float32Array(geo.vertices)
        return v.update(vertices)
    }

    return {
        layout: bufferLayout(),
        vertexCount: geo.vertices.length,
        indicesCount: geo.indices.length,
        vertices: v.buffer,
        indices: indicesBuffer(device, indices),
        options: options,
        update: update,
    }
}

function verticesBuffer(device, vertices) {
    const buffer = device.createBuffer({
        label: 'Plane Vertices Buffer',
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    })

    function update(vertices) {
        device.queue.writeBuffer(buffer, 0, vertices)
        return buffer
    }

    update(vertices)

    return {
        update,
        buffer,
    }
}

function geoplane({ size, resolution, position }) {
    const [x, y] = position
    const [widthSegments, heightSegments] = resolution
    const [width, height] = size.map((value) => value * 2)

    const indices = []
    const vertices = []

    const getY = (index) => (index * height) / heightSegments - height / 2 + y
    const getX = (index) => (index * width) / widthSegments - width / 2 + x

    for (let i = 0; i <= heightSegments; i++) {
        const y = getY(i)
        for (let j = 0; j <= widthSegments; j++) {
            const x = getX(j)
            vertices.push(x, y)
            pushIndices(i, j)
        }
    }

    function pushIndices(i, j) {
        // Indecies are used to describe which verties connect to form a triangle
        // Indecies is the plural of index
        if (i < heightSegments && j < widthSegments) {
            const a = i * (widthSegments + 1) + j
            const b = a + widthSegments + 1
            indices.push(a, b, a + 1)
            indices.push(b, b + 1, a + 1)
        }
    }

    const normals = new Float32Array(vertices.length).fill(0)
    const colors = new Float32Array(vertices.length).fill(1)
    const uvs = new Float32Array(vertices.length).fill(0)

    return {
        vertices,
        indices,
        colors,
        normals,
        uvs,
    }
}
