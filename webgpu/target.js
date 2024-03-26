export async function useTarget() {
  const { device, adapter } = await gpuDevice();
  const canvas = gpuCanvas(device);
  return {
    device: device,
    adapter: adapter,
    canvas: canvas
  }
}

export async function gpuDevice() {
    if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No appropriate GPUAdapter found.");

    const device = await adapter.requestDevice();
    return {
        adapter: adapter,
        device: device
    };
}

export  function gpuCanvas(device) {
    const canvas = document.querySelector("canvas");

    const context = canvas.getContext("webgpu");
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device: device,
        format: canvasFormat,
    });

    return {
        element: canvas,
        context: context,
        format: canvasFormat
    };
}