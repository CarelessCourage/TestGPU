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
