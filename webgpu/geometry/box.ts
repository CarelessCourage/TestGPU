/// <reference types="@webgpu/types" />
import { geoBuffer, bufferLayout, indicesBuffer } from './utils.ts'
import type { GeoObject, GeoBuffers, Geometry } from './utils.ts'

export function cube(
    { device }: { device: GPUDevice },
    options?: CubeOptions
): GeoObject {
    const geo = geoCube(options)
    const buffer = cubeBuffer({ device, geo })
    return {
        buffer,
        vertexCount: geo.vertices.length,
        indicesCount: geo.indices.length,
        indices: indicesBuffer({ device, indices: geo.indices }),
        set: () => buffer.update(),
        geometry: geo,
    }
}

interface CubeBufferProps {
    device: GPUDevice
    geo: Geometry
}

function cubeBuffer({ device, geo }: CubeBufferProps): GeoBuffers {
    const vertexBuffer = geoBuffer({ device, data: geo.vertices })
    const normalBuffer = geoBuffer({ device, data: geo.normals })
    const uvBuffer = geoBuffer({ device, data: geo.uvs })

    function update() {
        device.queue.writeBuffer(vertexBuffer, 0, geo.vertices)
        device.queue.writeBuffer(normalBuffer, 0, geo.normals)
        device.queue.writeBuffer(uvBuffer, 0, geo.uvs)
    }

    return {
        update: update,
        vertices: vertexBuffer,
        normals: normalBuffer,
        uvs: uvBuffer,
        layout: bufferLayout(),
    }
}

interface CubeOptions {
    size?: number | [number, number, number]
    resolution?: number | [number, number, number]
}

function geoCube(options?: CubeOptions): Geometry {
    const { size, resolution } = fallbackCubeOptions(options)

    const width = size[0]
    const height = size[1]
    const depth = size[2]

    const widthSegments = resolution[0]
    const heightSegments = resolution[1]
    const depthSegments = resolution[2]

    // geometry data
    const indices: number[] = []
    const vertices: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const colors: number[] = []

    // helper variables
    let numberOfVertices = 0

    // build each side of the box geometry
    buildPlane(
        'z',
        'y',
        'x',
        -1,
        -1,
        depth,
        height,
        width,
        depthSegments,
        heightSegments
    ) // px
    buildPlane(
        'z',
        'y',
        'x',
        1,
        -1,
        depth,
        height,
        -width,
        depthSegments,
        heightSegments
    ) // nx
    buildPlane(
        'x',
        'z',
        'y',
        1,
        1,
        width,
        depth,
        height,
        widthSegments,
        depthSegments
    ) // py
    buildPlane(
        'x',
        'z',
        'y',
        1,
        -1,
        width,
        depth,
        -height,
        widthSegments,
        depthSegments
    ) // ny
    buildPlane(
        'x',
        'y',
        'z',
        1,
        -1,
        width,
        height,
        depth,
        widthSegments,
        heightSegments
    ) // pz
    buildPlane(
        'x',
        'y',
        'z',
        -1,
        -1,
        width,
        height,
        -depth,
        widthSegments,
        heightSegments
    ) // nz

    function buildPlane(
        u: string,
        v: string,
        w: string,
        udir: number,
        vdir: number,
        width: number,
        height: number,
        depth: number,
        gridX: number,
        gridY: number
    ) {
        const segmentWidth = width / gridX
        const segmentHeight = height / gridY

        const widthHalf = width / 2
        const heightHalf = height / 2
        const depthHalf = depth / 2

        const gridX1 = gridX + 1
        const gridY1 = gridY + 1

        let vertexCounter = 0
        let groupCount = 0

        const vector = new Vector3()

        // generate vertices, normals and uvs

        for (let iy = 0; iy < gridY1; iy++) {
            const y = iy * segmentHeight - heightHalf

            for (let ix = 0; ix < gridX1; ix++) {
                const x = ix * segmentWidth - widthHalf

                // set values to correct vector component

                vector[u] = x * udir
                vector[v] = y * vdir
                vector[w] = depthHalf

                // now apply vector to vertex buffer

                vertices.push(vector.x, vector.y, vector.z)

                // set values to correct vector component

                vector[u] = 0
                vector[v] = 0
                vector[w] = depth > 0 ? 1 : -1

                // now apply vector to normal buffer

                normals.push(vector.x, vector.y, vector.z)

                // uvs

                uvs.push(ix / gridX)
                uvs.push(1 - iy / gridY)

                // counters

                vertexCounter += 1
            }
        }

        // indices

        // 1. you need three indices to draw a single face
        // 2. a single segment consists of two faces
        // 3. so we need to generate six (2*3) indices per segment

        for (let iy = 0; iy < gridY; iy++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = numberOfVertices + ix + gridX1 * iy
                const b = numberOfVertices + ix + gridX1 * (iy + 1)
                const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1)
                const d = numberOfVertices + (ix + 1) + gridX1 * iy

                // faces

                indices.push(a, b, d)
                indices.push(b, c, d)

                // increase counter

                groupCount += 6
            }
        }

        // update total number of vertices

        numberOfVertices += vertexCounter
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
        colors: new Float32Array(colors),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
    }
}

class Vector3 {
    x: number
    y: number
    z: number

    constructor(x = 0, y = 0, z = 0) {
        this.x = x
        this.y = y
        this.z = z
    }
}

function ensure3Values(
    value: number | [number, number, number]
): [number, number, number] {
    if (typeof value !== 'number') return value
    return [value, value, value]
}

function fallbackCubeOptions(options?: CubeOptions): Required<CubeOptions> {
    const size = ensure3Values(options?.size ?? 3)
    const resolution = ensure3Values(options?.resolution ?? 1)
    return { size, resolution }
}
