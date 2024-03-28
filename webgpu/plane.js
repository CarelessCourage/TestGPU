export function planeBuffer(device, size, res) {
  const geo = geoplane(size, res);

  const vertices = new Float32Array(geo.vertices);
  const indices = new Uint16Array(geo.indices);

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
      vertexCount: geo.vertices.length,
      indicesCount: geo.indices.length
  };
}

function geoplane(size, res) {
  const height = size[0];
  const width = size[1];
  const heightSegments = res[0];
  const widthSegments = res[1];

  const indices = [];
  const vertices = [];

  function pushIndices(i, j) {
    if(i < heightSegments && j < widthSegments) {
      const a = i * (widthSegments + 1) + j;
      const b = a + widthSegments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  for(let i = 0; i <= heightSegments; i++) {
    const y = i * height / heightSegments - height / 2;
    for(let j = 0; j <= widthSegments; j++) {
      const x = j * width / widthSegments - width / 2;
      vertices.push(x, y);
      pushIndices(i, j)
    }
  }

  return {vertices, indices};
}
