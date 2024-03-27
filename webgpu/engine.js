import shader from "./shader/shader.wgsl";
import { usePipeline, uTime, uf32 } from "./pipeline.js";
import { planeBuffer } from "./plane.js";
import { useTarget } from "./target.js";

async function moonBow() {
  const { device, canvas } = await useTarget()
  const plane = planeBuffer(device);

  const time = uTime(device)
  const intensity = uf32(device, 2.0)

  const pipeline = usePipeline(device, {
    plane: plane,
    canvas: canvas,
    shader: shader,
    uniforms: [
      time,
      intensity
    ]
  })

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
    pass.setVertexBuffer(0, plane.buffer);
    pass.setBindGroup(0, pipeline.bindGroup);
    pass.draw(plane.vertices.length / 2);
    pass.end();

    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
  });
}

moonBow();

function useFrame(interval = 1000 / 60, update) {
  setInterval(update, interval);
}
