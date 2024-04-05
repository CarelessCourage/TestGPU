/// <reference types="@webgpu/types" />
import { geoBuffer, bufferLayout, indicesBuffer } from './utils.ts'
import type { GeoObject, GeoBuffers, Geometry } from './utils.ts'

export function cube({ device }: { device: GPUDevice }): GeoObject {
    const geo = geoCube()
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

function geoCube(): Geometry {
    const width = 1
    const height = 1
    const depth = 1
    const widthSegments = 1
    const heightSegments = 1
    const depthSegments = 1

    // buffers
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
        u,
        v,
        w,
        udir,
        vdir,
        width,
        height,
        depth,
        gridX,
        gridY
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

function geoCube2(): Geometry {
    const size = 0.5

    // const bottomLeftFront  = [-1, -1,  1];
    // const bottomRightFront = [ 1, -1,  1];
    // const topLeftFront     = [-1,  1,  1];
    // const topRightFront    = [ 1,  1,  1];
    // const bottomLeftBack   = [-1, -1, -1];
    // const bottomRightBack  = [ 1, -1, -1];
    // const topLeftBack      = [-1,  1, -1];
    // const topRightBack     = [ 1,  1, -1];

    const vertices = new Float32Array([
        // front
        -1,
        -1,
        1, // bottom-left
        1,
        -1,
        1, // bottom-right
        1,
        1,
        1, // top-right

        1,
        1,
        1, // top-right
        -1,
        1,
        1, // top-left
        -1,
        -1,
        1, // bottom-left

        // right
        1,
        -1,
        1, // bottom-left
        1,
        -1,
        -1, // bottom-right
        1,
        1,
        -1, // top-right

        1,
        1,
        -1, // top-right
        1,
        1,
        1, // top-left
        1,
        -1,
        1, // bottom-left

        // back
        -1,
        -1,
        -1, // bottom-left
        -1,
        1,
        -1, // top-left
        1,
        1,
        -1, // top-right

        1,
        1,
        -1, // top-right
        1,
        -1,
        -1, // bottom-right
        -1,
        -1,
        -1, // bottom-left

        // left
        -1,
        -1,
        1, // bottom-right
        -1,
        1,
        1, // top-right
        -1,
        1,
        -1, // top-left

        -1,
        1,
        -1, // top-left
        -1,
        -1,
        -1, // bottom-left
        -1,
        -1,
        1, // bottom-right

        // top
        -1,
        1,
        1, // bottom-left
        1,
        1,
        1, // bottom-right
        1,
        1,
        -1, // top-right

        1,
        1,
        -1, // top-right
        -1,
        1,
        -1, // top-left
        -1,
        1,
        1, // bottom-left

        // bottom
        -1,
        -1,
        1, // bottom-left
        -1,
        -1,
        -1, // top-left
        1,
        -1,
        -1, // top-right

        1,
        -1,
        -1, // top-right
        1,
        -1,
        1, // bottom-right
        -1,
        -1,
        1, // bottom-left
    ])

    const scaledDownVertices = vertices.map((v) => v * size)

    const indices = new Uint16Array([
        // front
        0, 1, 2, 2, 3, 0,
        // right
        1, 5, 6, 6, 2, 1,
        // back
        4, 7, 6, 6, 5, 4,
        // left
        0, 3, 7, 7, 4, 0,
        // top
        3, 2, 6, 6, 7, 3,
        // bottom
        0, 4, 5, 5, 1, 0,
    ])

    const colors = new Float32Array([
        // front - blue
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // right - red
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        //back - yellow
        1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,
        //left - aqua
        0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
        // top - green
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // bottom - fuchsia
        1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1,
    ])

    const normals = new Float32Array([
        // front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // back
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
        // top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    ])

    const ul = 1
    const vl = 1
    const uvs = new Float32Array([
        //front
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
        //right
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
        //back
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
        //left
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
        //top
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
        //bottom
        0,
        0,
        ul,
        0,
        ul,
        vl,
        ul,
        vl,
        0,
        vl,
        0,
        0,
    ])

    return {
        vertices: scaledDownVertices,
        indices,
        colors,
        normals,
        uvs,
    }
}
