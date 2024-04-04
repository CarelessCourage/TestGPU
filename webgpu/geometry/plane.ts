import { geoBuffer, bufferLayout, indicesBuffer, getOptions } from './utils.ts'
import type { GeoObject, GeoBuffers, Geometry, Dim2Options } from './utils.ts'

interface PlaneProps {
    device: GPUDevice
    options: Dim2Options
}

export function plane({ device, options }: PlaneProps): GeoObject {
    const geo = geoplane(options)
    const buffer = planeBuffer({ device, options })
    return {
        buffer,
        vertexCount: geo.vertices.length,
        indicesCount: geo.indices.length,
        indices: indicesBuffer({ device, indices: geo.indices }),
        set: (options) => buffer.update(options),
    }
}

function planeBuffer({ device, options }: PlaneProps): GeoBuffers {
    const geo = geoplane(options)

    const vertexBuffer = geoBuffer({ device, data: geo.vertices })
    const normalBuffer = geoBuffer({ device, data: geo.normals })
    const uvBuffer = geoBuffer({ device, data: geo.uvs })

    function update(options?: Dim2Options) {
        const geo = geoplane(options)
        device.queue.writeBuffer(vertexBuffer, 0, geo.vertices)
        device.queue.writeBuffer(normalBuffer, 0, geo.normals)
        device.queue.writeBuffer(uvBuffer, 0, geo.uvs)
    }

    return {
        update: (options?: Dim2Options) => update(options),
        vertices: vertexBuffer,
        normals: normalBuffer,
        uvs: uvBuffer,
        layout: bufferLayout(),
    }
}

function geoplane(options?: Dim2Options): Geometry {
    const { size, resolution, position } = getOptions(options)

    const [x, y] = position
    const [widthSegments, heightSegments] = resolution
    const [width, height] = size.map((value) => value * 2)

    const indices: number[] = []
    const vertices: number[] = []

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

    const v = new Float32Array(vertices)
    const i = new Uint16Array(indices)
    return {
        vertices: v,
        indices: i,
        colors,
        normals,
        uvs,
    }
}
