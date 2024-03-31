export function passGeo({pass}, geo) {
    pass.setVertexBuffer(0, geo.vertices); // We can have multiple vertex buffers. Thats why we need to specify the index. 
    // geo.update({
    //     resolution: 1,
    //     position: [0.0, 0.7],
    //     size: 0.5,
    // });
    pass.setIndexBuffer(geo.indices, 'uint16'); // We can only have one index buffer. So we dont need to specify the index.
    pass.drawIndexed(geo.indicesCount, 1, 0, 0, 0);
}

export function passPipeline({pass}, pipeline) {
    pass.setPipeline(pipeline.pipeline);
    pass.setBindGroup(0, pipeline.bindGroup);
}

export function initRender({device, canvas}) {
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
    return { encoder, pass };
}

export function submitPass({device}, {encoder, pass}) {
    pass.end();
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);
}

export function render(interval = 1000 / 60, update) {
    setInterval(update, interval);
}