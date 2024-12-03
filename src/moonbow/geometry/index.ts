import type { GeoBuffers } from './utils.js'

export function getModel(buffer: GeoBuffers) {
  function bufferModel(passEncoder: GPURenderPassEncoder) {
    passEncoder.setVertexBuffer(0, buffer.vertices)
    passEncoder.setVertexBuffer(1, buffer.normals)
    passEncoder.setVertexBuffer(2, buffer.uvs)
  }

  function drawModel(passEncoder: GPURenderPassEncoder) {
    passEncoder.setIndexBuffer(buffer.indices, 'uint16')
    passEncoder.drawIndexed(buffer.indicesCount, 1, 0, 0, 0)
  }

  return {
    bufferModel,
    drawModel
  }
}

type GetModel = ReturnType<typeof getModel>
export type { GetModel }
