import { mat4, vec3 } from 'gl-matrix';

export function boxBuffer({device}) {
    // Describes how the data is packed in the vertex buffers
    const perVertex = 3 + 3 + 2;
    const stride = perVertex * 4;
    const vertexBufferLayout = bufferLayout(stride);

    const geo = geoBox({
      size: 1, 
      positions: [0, 0, 0], 
      rotation: [1, 0, 1]
    });
    
    const vertices = new Float32Array(geo.vertices.length * stride);
    const indices = new Uint16Array(geo.indices);
    const buffer = device.createBuffer({
      label: "Plane Vertices Buffer",
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    const scale = 0.3;
    
    update();
    function update() {
      geo.vertices.forEach((vertex, i) => {
        const posx = vertex.pos[0] * scale; // * scaleX;
        const posy = vertex.pos[1] * scale; // * scaleY;
        const posz = vertex.pos[2] * scale; // * scaleZ;
        vertices.set([posx, posy, posz], perVertex * i + 0);
        vertices.set(vertex.norm, perVertex * i + 3);
        vertices.set(vertex.uv, perVertex * i + 6);
      });
      device.queue.writeBuffer(buffer, 0, vertices.buffer);
    }

    const x = 0;
    const y = 0;
    const z = 0;

    const rotX = 0;
    const rotY = 0;
    const rotZ = 0;

    transform()

    function transform() {
      const transform = mat4.create();
      const rotate = mat4.create();

      mat4.translate(transform, transform, vec3.fromValues(x, y, z))
      mat4.rotateX(transform, transform, rotX);
      mat4.rotateY(transform, transform, rotY);
      mat4.rotateZ(transform, transform, rotZ);

      mat4.rotateX(rotate, rotate, rotX);
      mat4.rotateY(rotate, rotate, rotY);
      mat4.rotateZ(rotate, rotate, rotZ);

      console.log({transform, geo: geo.vertices})
    }

    return {
      vertices: buffer,
      layout: vertexBufferLayout,
      vertexCount: geo.vertices.length,
      indicesCount: geo.indices.length,
      indices: indicesBuffer(device, indices),
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
  
  function bufferLayout(stride) {
    return {
      arrayStride: stride,
      attributes: [
          {
              // position
              format: "float32x3",
              offset: 0,
              shaderLocation: 0, // builtin(position), see vertex shader
          },
          {
              // normal
              format: "float32x3",
              offset: 3 * 4,
              shaderLocation: 1,
          },
          {
              // uv
              format: "float32x2",
              offset: (3 + 3) * 4,
              shaderLocation: 2,
          },
      ],
    }
  }
  
  function geoBox({size, positions, rotation}) {
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
    
    // Create a transformation matrix
    let transformMatrix = mat4.create();

    // Apply transformations
    mat4.translate(transformMatrix, transformMatrix, positions); // Translate
    mat4.rotateX(transformMatrix, transformMatrix, rotation[0]); // Rotate around X-axis
    mat4.rotateY(transformMatrix, transformMatrix, rotation[1]); // Rotate around Y-axis
    mat4.rotateZ(transformMatrix, transformMatrix, rotation[2]); // Rotate around Z-axis
    mat4.scale(transformMatrix, transformMatrix, [size, size, size]); // Scale

    // Apply the transformation matrix to each vertex's position
    vertices.forEach(vertex => {
        let transformedPosition = vec3.create();
        vec3.transformMat4(transformedPosition, vertex.pos, transformMatrix);
        vertex.pos = transformedPosition;
    });
    
    const indices = [];
    for (let i = 0; i < vertices.length; i += 6) {
        indices.push(i, i + 1, i + 2, i + 3, i + 4, i + 5);
    }
  
    return {vertices, indices};
  }
  

  