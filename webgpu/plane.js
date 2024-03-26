export function planeBuffer(device) {
    const size = 1.0;
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
      buffer: vertexBuffer,
      vertices: vertices,
      layout: vertexBufferLayout
    }
  }
  