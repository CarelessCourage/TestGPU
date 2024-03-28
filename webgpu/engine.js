import shader from "./shader/shader.wgsl";
import { usePipeline, uTime, uf32 } from "./pipeline.js";
import { planeBuffer, planeBuffer2 } from "./plane.js";
import { useTarget } from "./target.js";

async function moonBow() {
  const { device, canvas } = await useTarget();
  const plane = planeBuffer(device, 1, 1, 4, 4);
  //const plane2 = planeBuffer2(device);

  const time = uTime(device);
  const intensity = uf32(device, 2.0);

  const pipeline = usePipeline(device, {
    plane: plane,
    canvas: canvas,
    shader: shader,
    wireframe: true,
    uniforms: [
      time,
      intensity
    ]
  });

  useFrame(1000 / 60, () => {
    time.update();

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        // @location(0), see fragment shader
        view: canvas.context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
        storeOp: "store",
      }]
    });

    pass.setPipeline(pipeline.pipeline);
    pass.setVertexBuffer(0, plane.vertices); // We can have multiple vertex buffers. Thats why we need to specify the index. 
    pass.setIndexBuffer(plane.indices, 'uint16'); // We can only have one index buffer. So we dont need to specify the index.
    pass.setBindGroup(0, pipeline.bindGroup);
    pass.drawIndexed(plane.indicesCount, 1, 0, 0, 0);
    //pass.draw(plane.vertexCount / 2, 0, 0, 0); // The fuck does these numbers do
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  });
}

moonBow();

function useFrame(interval = 1000 / 60, update) {
  setInterval(update, interval);
}
