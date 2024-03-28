export function planeBuffer2(device) {
  const size = 0.8;
  const vertices = new Float32Array([-size, -size, size, -size, size, size, -size, -size, size,  size, -size, size]);

  const vertexBuffer = device.createBuffer({
    label: "Plane Vertices Buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);

  //Describes how your data is packed in the vertex buffers
  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // builtin(position), see vertex shader
    }],
  };

  return {
    vertices: vertexBuffer,
    layout: vertexBufferLayout,
    vertexCount: vertices.length / 2,
  }
}

export function planeBuffer(device, width, height, widthSegments, heightSegments) {
  const vert = vertex(width, height, widthSegments, heightSegments);

  const vertices = new Float32Array(vert.vertices);
  const indices = new Uint16Array(vert.indices);

  const verticesBuffer = device.createBuffer({
      label: "Plane Vertices Buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(verticesBuffer, 0, vertices);

  const indicesBuffer = device.createBuffer({
      label: "Plane Indices Buffer",
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indicesBuffer, 0, indices);

  //Describes how your data is packed in the vertex buffers
  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // builtin(position), see vertex shader
    }],
  };

  return {
      vertices: verticesBuffer,
      indices: indicesBuffer,
      layout: vertexBufferLayout,
      vertexCount: vert.vertices.length,
      indicesCount: vert.indices.length
  };
}

// lolers 

function vertex(width, height, widthSegments, heightSegments) {
  const indices = [];
  const vertices = [];

  for(let i = 0; i <= heightSegments; i++) {
    const y = i * height / heightSegments - height / 2;

    for(let j = 0; j <= widthSegments; j++) {
      const x = j * width / widthSegments - width / 2;

      vertices.push(x, y);

      if(i < heightSegments && j < widthSegments) {
        const a = i * (widthSegments + 1) + j;
        const b = a + widthSegments + 1;

        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }
  }

  return {vertices, indices};
}
