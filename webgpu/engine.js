import shader from "./shader/basic.wgsl";
import { usePipeline, uTime, f32 } from "./pipeline.js";
import { planeBuffer } from "./plane.js";
import { boxBuffer } from "./box.js";
import { gpuTarget } from "./target.js";
import { render, passGeo, passPipeline, initRender, submitPass } from "./render.js";

async function moonBow() {
  const gpu = await gpuTarget();

  const plane = planeBuffer(gpu, {
    position: [0.0, 0.0],
    resolution: 1,
    size: 1.0,
  });

  const box = boxBuffer(gpu);

  // const plane2 = planeBuffer(gpu, {
  //   resolution: 1,
  //   position: [0.0, 0.5],
  //   size: 0.2,
  // });

  const time = uTime(gpu);
  const intensity = f32(gpu, 1.0);
  const scale = f32(gpu, 1.0);

  const pipeline = usePipeline(gpu, {
    shader: shader,
    layout: box.layout,
    wireframe: false,
    uniforms: [
      intensity,
      scale,
      time,
    ]
  });

  render(1000 / 60, () => {
    time.update();
    const render = initRender(gpu);
    passPipeline(render, pipeline);
    // passGeo(render, plane);

    render.pass.setVertexBuffer(0, box.vertices);
    render.pass.setIndexBuffer(box.indices, 'uint16');
    render.pass.drawIndexed(box.indicesCount, 1, 0, 0, 0);

    // passGeo(render, plane2);
    submitPass(gpu, render);
  });
}


moonBow();