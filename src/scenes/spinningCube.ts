import { cube } from '../moonbow'

export function spinningCube(device: GPUDevice) {
  const resolution = 15
  const size: [number, number, number] = [1, 1, 1]

  const object = cube(device, {
    size,
    resolution,
    position: [0, 0, 0]
  })

  function render(pass: GPURenderPassEncoder, rotation: number) {
    object.set(pass, { rotation: [0.5, rotation, 0] })
  }

  return { render }
}
