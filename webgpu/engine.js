import shader from "./shader/shader.wgsl";
import { usePipeline, uTime, uf32 } from "./pipeline.js";
import { planeBuffer } from "./plane.js";
import { gpuTarget } from "./target.js";
import { render, passGeo, passPipeline, initRender, submitPass } from "./render.js";

async function moonBow() {
  const gpu = await gpuTarget();

  const plane = planeBuffer(gpu, {
    resolution: 1,
    position: [0.0, 0.0],
    size: 1,
  });

  const time = uTime(gpu);
  const intensity = uf32(gpu, 1.0);
  const planeSize = uf32(gpu, plane.options.size);
  const scale = uf32(gpu, 1.0);

  const pipeline = usePipeline(gpu, {
    shader: shader,
    layout: plane.layout,
    wireframe: false,
    uniforms: [
      time,
      intensity,
      planeSize,
      scale,
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
