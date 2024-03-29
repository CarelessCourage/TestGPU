import shader from "./shader/shader.wgsl";
import { usePipeline, uTime, uf32 } from "./pipeline.js";
import { planeBuffer } from "./plane.js";
import { gpuTarget } from "./target.js";
import { render, passGeo, passPipeline, initRender, submitPass } from "./render.js";

async function moonBow() {
  const gpu = await gpuTarget();
  const plane = planeBuffer(gpu, 0.5, 1);

  const time = uTime(gpu);
  const intensity = uf32(gpu, 2.0);

  const pipeline = usePipeline(gpu, {
    shader: shader,
    layout: plane.layout,
    wireframe: true,
    uniforms: [
      time,
      intensity
    ]
  });

  render(1000 / 60, () => {
    time.update();
    const render = initRender(gpu);
    passPipeline(render, pipeline);
    passGeo(render, plane);
    submitPass(gpu, render);
  });
}

moonBow();
