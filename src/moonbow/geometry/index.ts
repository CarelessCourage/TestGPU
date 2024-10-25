import type { GeoBuffers } from './utils.js'

export function renderObject(passEncoder: GPURenderPassEncoder, buffer: GeoBuffers) {
  // Set Geometry
  passEncoder.setVertexBuffer(0, buffer.vertices)
  passEncoder.setVertexBuffer(1, buffer.normals)
  passEncoder.setVertexBuffer(2, buffer.uvs)

  // Draw Geometry
  passEncoder.setIndexBuffer(buffer.indices, 'uint16')
  passEncoder.drawIndexed(buffer.indicesCount, 1, 0, 0, 0)
}
