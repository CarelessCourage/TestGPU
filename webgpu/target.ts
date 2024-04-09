export interface GPUTarget {
    device: GPUDevice
    adapter: GPUAdapter
    canvas: GPUCanvas
}

export async function gpuTarget(): Promise<GPUTarget> {
    const { device, adapter } = await useGPU()
    const canvas = gpuCanvas(device)
    return {
        device: device,
        adapter: adapter,
        canvas: canvas,
    }
}

export async function useGPU() {
    if (!navigator.gpu) throw new Error('WebGPU not supported on this browser.')
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) throw new Error('No appropriate GPUAdapter found.')
    const device = await adapter.requestDevice()

    return {
        adapter: adapter,
        device: device,
    }
}

interface GPUCanvas {
    element: HTMLCanvasElement
    context: GPUCanvasContext
    format: GPUTextureFormat
}

export function gpuCanvas(
    device: GPUDevice,
    canvas: HTMLCanvasElement | null = document.querySelector('canvas')
): GPUCanvas {
    if (!canvas) throw new Error('No canvas found.')
    const context = canvas.getContext('webgpu')
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat()
    if (!context) throw new Error('No context found.')

    context.configure({
        device: device,
        format: canvasFormat,
    })

    return {
        element: canvas,
        context: context,
        format: canvasFormat,
    }
}
