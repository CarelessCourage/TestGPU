export function planeBuffer({device}, passedOptions) {
  const options = getOptions(passedOptions)

  const geo = geoplane(options);
  const vertices = new Float32Array(geo.vertices);
  const indices = new Uint16Array(geo.indices);

  // Describes how the data is packed in the vertex buffers
  const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [{
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // builtin(position), see vertex shader
    }],
  };

  return {
    layout: vertexBufferLayout,
    vertexCount: geo.vertices.length,
    indicesCount: geo.indices.length,
    vertices: verticesBuffer(device, vertices),
    indices: indicesBuffer(device, indices),
    options: options,
  };
}

function verticesBuffer(device, vertices) {
  const buffer = device.createBuffer({
    label: "Plane Vertices Buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, vertices);
  return buffer;
}

function indicesBuffer(device, indices) {
  const buffer = device.createBuffer({
    label: "Plane Indices Buffer",
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(buffer, 0, indices);
  return buffer;
}

function ensureTwoElementArray(value) {
  // value could be: n, [n], [n, n]. We want to return [n, n] no matter what.
  const y = Array.isArray(value) ? value[0] : value;
  const x = Array.isArray(value) ? value[1] || value[0] : value;
  return [x, y];
}

function getOptions(passedOptions) {
  const options = {
    size: 2, 
    resolution: 1, 
    position: 0, 
    ...passedOptions
  };
  return {
    size: ensureTwoElementArray(options.size),
    resolution: ensureTwoElementArray(options.resolution),
    position: ensureTwoElementArray(options.position),
  }
}

function geoplane({size, resolution, position}) {
  const [x, y] = position;
  const [width, height] = size;
  const [widthSegments, heightSegments] = resolution;

  const indices = [];
  const vertices = [];

  const getY = (index) => index * height / heightSegments - height / 2 + y;
  const getX = (index) => index * width / widthSegments - width / 2 + x;

  for(let i = 0; i <= heightSegments; i++) {
    const y = getY(i);
    for(let j = 0; j <= widthSegments; j++) {
      const x = getX(j);
      vertices.push(x, y);
      pushIndices(i, j)
    }
  }

  function pushIndices(i, j) {
    // Indecies are used to describe which verties connect to form a triangle
    // Indecies is the plural of index
    if(i < heightSegments && j < widthSegments) {
      const a = i * (widthSegments + 1) + j;
      const b = a + widthSegments + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  return {vertices, indices};
}
