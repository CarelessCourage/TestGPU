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
        geometry: geo,
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

    const width_half = width / 2
    const height_half = height / 2

    const gridX = Math.floor(widthSegments)
    const gridY = Math.floor(heightSegments)

    const gridX1 = gridX + 1
    const gridY1 = gridY + 1

    const segment_width = width / gridX
    const segment_height = height / gridY

    const indices: number[] = []
    const vertices: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const colors: number[] = []

    for (let iy = 0; iy < gridY1; iy++) {
        const y = iy * segment_height - height_half
        for (let ix = 0; ix < gridX1; ix++) {
            const x = ix * segment_width - width_half
            vertices.push(x, -y, 0)
            normals.push(0, 0, 1)
            uvs.push(ix / gridX)
            uvs.push(1 - iy / gridY)
        }
    }

    for (let iy = 0; iy < gridY; iy++) {
        for (let ix = 0; ix < gridX; ix++) {
            const a = ix + gridX1 * iy
            const b = ix + gridX1 * (iy + 1)
            const c = ix + 1 + gridX1 * (iy + 1)
            const d = ix + 1 + gridX1 * iy
            indices.push(a, b, d)
            indices.push(b, c, d)
        }
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
        colors: new Float32Array(colors),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
    }
}
