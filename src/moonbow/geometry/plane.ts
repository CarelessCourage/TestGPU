/// <reference types="@webgpu/types" />
import { geoBuffer, bufferVertexLayout, indicesBuffer } from './utils.js'
import type { GeoBuffers, Geometry, ModelOptions } from './utils.js'
import { getModel } from './'

export function plane(device: GPUDevice) {
  const buffer = planeBuffer(device)
  return getModel(buffer)
}

function planeBuffer(device: GPUDevice): GeoBuffers {
  const geometry = planeGeometry()

  const vBuffer = geoBuffer({ device, data: geometry.vertices })
  const nBuffer = geoBuffer({ device, data: geometry.normals })
  const uvBuffer = geoBuffer({ device, data: geometry.uvs })

  const indices = indicesBuffer({
    device: device,
    indices: geometry.indices
  })

  function update() {
    const geo = planeGeometry()
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
    indicesCount: geometry.indicesCount,
    normals: nBuffer,
    uvs: uvBuffer,
    layout: bufferVertexLayout(),
    geometry: geometry
  }
}

function planeGeometry(): Geometry {
  const size = 0.8
  const indices: number[] = [0, 1, 2, 2, 1, 3] // Two triangles (0,1,2) and (2,1,3)

  const vertices = new Float32Array([
    -size,
    -size,
    size, // Vertex 0

    -size,
    size,
    size, // Vertex 1

    size,
    -size,
    size, // Vertex 2

    size,
    size,
    size // Vertex 3
  ])

  const normals: number[] = [
    0,
    0,
    1, // Normal for Vertex 0

    0,
    0,
    1, // Normal for Vertex 1

    0,
    0,
    1, // Normal for Vertex 2

    0,
    0,
    1 // Normal for Vertex 3
  ] // All normals are pointing in the positive z direction

  const uvs: number[] = [
    0,
    0, // UV for Vertex 0

    0,
    1, // UV for Vertex 1

    1,
    0, // UV for Vertex 2

    1,
    1 // UV for Vertex 3
  ] // UV coordinates for texture mapping

  const colors: number[] = [
    1,
    1,
    1, // Color for Vertex 0 (white)

    1,
    1,
    1, // Color for Vertex 1 (white)

    1,
    1,
    1, // Color for Vertex 2 (white)

    1,
    1,
    1 // Color for Vertex 3 (white)
  ] // All vertices are colored white

  return {
    vertices: vertices,
    indices: new Uint16Array(indices),
    colors: new Float32Array(colors),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    vertexCount: vertices.length,
    indicesCount: indices.length
  }
}
