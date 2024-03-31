export function boxBuffer({device}) {
    const geo = geoBox();
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
  
    const v = verticesBuffer(device, vertices); // Figure out something prettier for this that lets me update the geometry
  
    function update(passedOptions) {
      const options = getOptions(passedOptions)
      const geo = geoBox(options);
      const vertices = new Float32Array(geo.vertices);
      return v.update(vertices);
    }
  
    return {
      layout: vertexBufferLayout,
      vertexCount: geo.vertices.length,
      indicesCount: geo.indices.length,
      vertices: v.buffer,
      indices: indicesBuffer(device, indices),
      update: update,
    };
  }
  
  function verticesBuffer(device, vertices) {
    const buffer = device.createBuffer({
      label: "Plane Vertices Buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
  
    function update(vertices) {
      device.queue.writeBuffer(buffer, 0, vertices);
      return buffer;
    }
  
    update(vertices);
  
    return {
      update,
      buffer,
    };
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
      position: ensureTwoElementArray(options.position),
    }
  }
  
  function geoBox() {
    const vertices = [
        // front
        { pos: [-1, -1,  1], norm: [ 0,  0,  1], uv: [0, 0], },
        { pos: [ 1, -1,  1], norm: [ 0,  0,  1], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [ 0,  0,  1], uv: [0, 1], },
        
        { pos: [-1,  1,  1], norm: [ 0,  0,  1], uv: [0, 1], },
        { pos: [ 1, -1,  1], norm: [ 0,  0,  1], uv: [1, 0], },
        { pos: [ 1,  1,  1], norm: [ 0,  0,  1], uv: [1, 1], },
        // right
        { pos: [ 1, -1,  1], norm: [ 1,  0,  0], uv: [0, 0], },
        { pos: [ 1, -1, -1], norm: [ 1,  0,  0], uv: [1, 0], },
        { pos: [ 1,  1,  1], norm: [ 1,  0,  0], uv: [0, 1], },
        
        { pos: [ 1,  1,  1], norm: [ 1,  0,  0], uv: [0, 1], },
        { pos: [ 1, -1, -1], norm: [ 1,  0,  0], uv: [1, 0], },
        { pos: [ 1,  1, -1], norm: [ 1,  0,  0], uv: [1, 1], },
        // back
        { pos: [ 1, -1, -1], norm: [ 0,  0, -1], uv: [0, 0], },
        { pos: [-1, -1, -1], norm: [ 0,  0, -1], uv: [1, 0], },
        { pos: [ 1,  1, -1], norm: [ 0,  0, -1], uv: [0, 1], },
        
        { pos: [ 1,  1, -1], norm: [ 0,  0, -1], uv: [0, 1], },
        { pos: [-1, -1, -1], norm: [ 0,  0, -1], uv: [1, 0], },
        { pos: [-1,  1, -1], norm: [ 0,  0, -1], uv: [1, 1], },
        // left
        { pos: [-1, -1, -1], norm: [-1,  0,  0], uv: [0, 0], },
        { pos: [-1, -1,  1], norm: [-1,  0,  0], uv: [1, 0], },
        { pos: [-1,  1, -1], norm: [-1,  0,  0], uv: [0, 1], },
        
        { pos: [-1,  1, -1], norm: [-1,  0,  0], uv: [0, 1], },
        { pos: [-1, -1,  1], norm: [-1,  0,  0], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [-1,  0,  0], uv: [1, 1], },
        // top
        { pos: [ 1,  1, -1], norm: [ 0,  1,  0], uv: [0, 0], },
        { pos: [-1,  1, -1], norm: [ 0,  1,  0], uv: [1, 0], },
        { pos: [ 1,  1,  1], norm: [ 0,  1,  0], uv: [0, 1], },
        
        { pos: [ 1,  1,  1], norm: [ 0,  1,  0], uv: [0, 1], },
        { pos: [-1,  1, -1], norm: [ 0,  1,  0], uv: [1, 0], },
        { pos: [-1,  1,  1], norm: [ 0,  1,  0], uv: [1, 1], },
        // bottom
        { pos: [ 1, -1,  1], norm: [ 0, -1,  0], uv: [0, 0], },
        { pos: [-1, -1,  1], norm: [ 0, -1,  0], uv: [1, 0], },
        { pos: [ 1, -1, -1], norm: [ 0, -1,  0], uv: [0, 1], },
        
        { pos: [ 1, -1, -1], norm: [ 0, -1,  0], uv: [0, 1], },
        { pos: [-1, -1,  1], norm: [ 0, -1,  0], uv: [1, 0], },
        { pos: [-1, -1, -1], norm: [ 0, -1,  0], uv: [1, 1], }
    ];
    
    const indices = [];
    for (let i = 0; i < vertices.length; i += 6) {
        indices.push(i, i + 1, i + 2, i + 3, i + 4, i + 5);
    }
  
    return {vertices, indices};
  }
  

  