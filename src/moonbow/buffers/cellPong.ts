import { storageBuffer, float } from '..'

// Create an array representing the active state of each cell.
// Storage buffers are more flexible and much bigger than uniform buffers
// but uniform buffers are sometimes prioritised by the GPU so they might be faster depending on the GPU

export function cellPong(device: GPUDevice, GRID_SIZE: number) {
  const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE)
  const grid = float(device, [GRID_SIZE, GRID_SIZE])

  // Set each cell to a random state,
  // then copy the JavaScript array into the storage buffer.
  for (let i = 0; i < cellStateArray.length; ++i) {
    cellStateArray[i] = Math.random() > 0.6 ? 1 : 0
  }
  const stateA = storageBuffer(device, {
    label: 'Cell - State A',
    size: cellStateArray.byteLength,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, cellStateArray)
  })

  // Mark every other cell of the second grid as active.
  for (let i = 0; i < cellStateArray.length; i++) {
    cellStateArray[i] = i % 2 // We are saving memory by reusing the same array
  }
  const stateB = storageBuffer(device, {
    label: 'Cell - State B',
    size: cellStateArray.byteLength,
    update: (buffer) => device.queue.writeBuffer(buffer, 0, cellStateArray)
  })

  return {
    grid,
    a: stateA.buffer,
    b: stateB.buffer
  }
}
