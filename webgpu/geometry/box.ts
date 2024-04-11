/// <reference types="@webgpu/types" />
import { mat4 } from 'gl-matrix'
import {
    geoBuffer,
    bufferLayout,
    indicesBuffer,
    modelMatrix,
    ensure3Values,
} from './utils.ts'
import type { GeoObject, GeoBuffers, Geometry, ModelOptions } from './utils.ts'
import { drawObject } from '../render.ts'

export function cube(device: GPUDevice, options: ModelOptions): GeoObject {
    const geo = geoCube(options)
    const buffer = cubeBuffer(device, options, geo)

    const draw = (pass: GPURenderPassEncoder) => drawObject(pass, buffer)

    function set(pass: GPURenderPassEncoder, options: ModelOptions) {
        // Lets you set the options and draw the object in one call
        // Usefull for when the options change each draw
        buffer.update(options)
        draw(pass)
    }

    return {
        buffer,
        geometry: geo,
        set: set,
        draw: draw,
        update: (options: ModelOptions) => {
            buffer.update(options)
            return { draw }
        },
    }
}

function cubeBuffer(
    device: GPUDevice,
    options: ModelOptions,
    geo: Geometry
): GeoBuffers {
    const vBuffer = geoBuffer({ device, data: geo.vertices })
    const nBuffer = geoBuffer({ device, data: geo.normals })
    const uvBuffer = geoBuffer({ device, data: geo.uvs })

    const indices = indicesBuffer({
        device: device,
        indices: geo.indices,
    })

    function update(o: ModelOptions) {
        const geo = geoCube({ ...options, ...o })
        const vertices = new Float32Array(geo.vertices)
        const normals = new Float32Array(geo.normals)
        const uvs = new Float32Array(geo.uvs)

        device.queue.writeBuffer(vBuffer, 0, vertices.buffer)
        device.queue.writeBuffer(nBuffer, 0, normals.buffer)
        device.queue.writeBuffer(uvBuffer, 0, uvs.buffer)
    }

    return {
        update: update,
        vertices: vBuffer,
        indices: indices,
        indicesCount: geo.indicesCount,
        normals: nBuffer,
        uvs: uvBuffer,
        layout: bufferLayout(),
    }
}

function geoCube(options?: ModelOptions): Geometry {
    const resolution = ensure3Values(options?.resolution ?? 1)

    const size = 3
    const width = size
    const height = size
    const depth = size

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

    // TODO: prop to decide number of faces

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

    const transform = modelMatrix(options)
    const transformedVertices: number[] = []
    for (let i = 0; i < vertices.length; i += 3) {
        const vertex: [number, number, number] = [
            vertices[i],
            vertices[i + 1],
            vertices[i + 2],
        ]
        const transformedVertex = transformVertex(vertex, transform)
        transformedVertices.push(...transformedVertex)
    }

    return {
        vertices: new Float32Array(transformedVertices),
        indices: new Uint16Array(indices),
        colors: new Float32Array(colors),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        vertexCount: transformedVertices.length,
        indicesCount: indices.length,
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

function transformVertex(vertex: [number, number, number], matrix: mat4) {
    const [x, y, z] = vertex
    const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] // Apply perspective
    return [
        (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w, // Apply transformation and perspective divide
        (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
        (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
    ]
}
