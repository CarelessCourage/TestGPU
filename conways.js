if (!navigator.gpu) throw new Error("WebGPU not supported on this browser.");
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("No appropriate GPUAdapter found.");

      //Config
      const GRID_SIZE = 200;
      const UPDATE_INTERVAL = 3; // Update every 200ms (5 times/sec)

      const canvas = document.querySelector("canvas");
      const device = await adapter.requestDevice();

      const context = canvas.getContext("webgpu");
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device: device,
        format: canvasFormat,
      });

      const vertices = new Float32Array([-0.8, -0.8, 0.8, -0.8, 0.8,  0.8, -0.8, -0.8, 0.8,  0.8, -0.8,  0.8]);
      const vertexBuffer = device.createBuffer({
        label: "Cell vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/0, vertices);

      //Uniform buffers and vertex buffers are both buffers, but they are used differently.
      const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
      const uniformBuffer = device.createBuffer({
        label: "Grid Uniforms",
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(uniformBuffer, /*bufferOffset=*/0, uniformArray);

      // Create an array representing the active state of each cell.
      // Storage buffers are more flexible and much bigger than uniform buffers 
      // but uniform buffers are sometimes prioritised by the GPU so they might be faster depending on the GPU
      const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);
      const cellStateStorage = [ //We doubling up on the same buffer because we are using the ping-pong buffer pattern
          device.createBuffer({
            label: "Cell State A",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          }),
          device.createBuffer({
            label: "Cell State B",
            size: cellStateArray.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          })
        ];

      // Set each cell to a random state, then copy the JavaScript array 
      // into the storage buffer.
      for (let i = 0; i < cellStateArray.length; ++i) {
        cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
      }
      device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

      // Mark every other cell of the second grid as active.
      for (let i = 0; i < cellStateArray.length; i++) {
        cellStateArray[i] = i % 2; // We are saving memory by reusing the same array
      }
      device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

      //Describes how your data is packed in the vertex buffers
      const vertexBufferLayout = {
        arrayStride: 8,
        attributes: [{
          format: "float32x2",
          offset: 0,
          shaderLocation: 0, // builtin(position), see vertex shader
        }],
      };

      const cellShaderModule = device.createShaderModule({
        label: "Cell shader",
        code: `
          //Structs are like TS interfaces
          struct VertexInput {
            @location(0) pos: vec2f,
            @builtin(instance_index) instance: u32,
          };

          struct VertexOutput {
            @builtin(position) pos: vec4f,
            @location(0) cell: vec2f,
          };

          //This is uniform data that is passed to the shader
          @group(0) @binding(0) var<uniform> grid: vec2f;
          @group(0) @binding(1) var<storage> cellState: array<u32>;

          @vertex
          fn vertexMain(input: VertexInput) -> VertexOutput {

            let state = f32(cellState[input.instance]);
            //Makes sure the square is aligned with the grid since the square would normally be aligned with the center
            let gridPos = (input.pos * state + 1) / grid;
            
            //Makes sure that 0 is bottom right and not center
            let normalisedPos = gridPos - 1;

            let i = f32(input.instance); // Type cast the instance to a float instead of an unsigned int
            //Maps cell instance to the grid
            let cell = vec2f(i % grid.x, floor(i / grid.x));

            let cellOffset = cell / grid * 2;
            let cellPos = normalisedPos + cellOffset;

            var output: VertexOutput;
            output.pos = vec4f(cellPos, 0, 1);
            output.cell = cell;
            return output;
          }

          @fragment
          fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let color = vec2f(input.cell/grid);
            return vec4f(color, color.y, 1);
          }
        `
      });

      const WORKGROUP_SIZE = 8;
      // Create the compute shader that will process the simulation.
      const simulationShaderModule = device.createShaderModule({
        label: "Game of Life simulation shader",
        code: `
        @group(0) @binding(0) var<uniform> grid: vec2f;

        @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
        @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

        fn cellIndex(cell: vec2u) -> u32 {
          // return cell.y * u32(grid.x) + cell.x; <- simpler one, the % is neccesary so that the index for an edge cell counts the cell on the other side 
          // as its neighbour. Sort of like a wrap around effect that prevents accessing memory that is out of bounds
          return (cell.y % u32(grid.y)) * u32(grid.x) +
                (cell.x % u32(grid.x));
        }
        
        fn cellActive(x: u32, y: u32) -> u32 {
          return cellStateIn[cellIndex(vec2(x, y))];
        }

        @compute
        @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
        fn computeMain(@builtin(global_invocation_id) cell: vec3u) {
          // Determine how many active neighbors this cell has.
          let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                        cellActive(cell.x+1, cell.y) +
                        cellActive(cell.x+1, cell.y-1) +
                        cellActive(cell.x, cell.y-1) +
                        cellActive(cell.x-1, cell.y-1) +
                        cellActive(cell.x-1, cell.y) +
                        cellActive(cell.x-1, cell.y+1) +
                        cellActive(cell.x, cell.y+1);

          let i = cellIndex(cell.xy);

          // Conway's game of life rules:
          switch activeNeighbors {
            case 2: { // Active cells with 2 neighbors stay active.
              cellStateOut[i] = cellStateIn[i];
            }
            case 3: { // Cells with 3 neighbors become or stay active.
              cellStateOut[i] = 1;
            }
            default: { // Cells with < 2 or > 3 neighbors become inactive.
              cellStateOut[i] = 0;
            }
          }
        }`
      });

      // We create this layout because we are sharing the same bindlayout between two diffirent shaders - and one shader might use a diffirent amount of stuff from the layout than another shader. 
      // Normally we could just auto it bit because of this variation we need to define what the layout is
      const bindGroupLayout = device.createBindGroupLayout({
        label: "Cell Bind Group Layout",
        entries: [{
          binding: 0,
          // Add GPUShaderStage.FRAGMENT here if you are using the `grid` uniform in the fragment shader.
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
          buffer: {} // Grid uniform buffer
        }, {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
          buffer: { type: "read-only-storage"} // Cell state input buffer
        }, {
          binding: 2,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage"} // Cell state output buffer
        }]
      });

      const pipelineLayout = device.createPipelineLayout({
        label: "Cell Pipeline Layout",
        bindGroupLayouts: [ bindGroupLayout ],
      });

      const cellPipeline = device.createRenderPipeline({
        label: "Cell pipeline",
        //layout: "auto",
        layout: pipelineLayout, // No longer auto generating it
        vertex: {
          module: cellShaderModule,
          entryPoint: "vertexMain",
          buffers: [ vertexBufferLayout ]
        },
        fragment: {
          module: cellShaderModule,
          entryPoint: "fragmentMain",
          targets: [{
            //Matches colorAttachments
            format: canvasFormat
          }]
        }
      });

      // Create a compute pipeline that updates the game state.
      const simulationPipeline = device.createComputePipeline({
        label: "Simulation pipeline",
        layout: pipelineLayout,
        compute: {
          module: simulationShaderModule,
          entryPoint: "computeMain",
        }
      });

      // This is where we attach the uniform to the shader through the pipeline
      // Its doubbled up because we are using the ping-pong buffer pattern
      const bindGroups = [
        device.createBindGroup({
          label: "Cell renderer bind group A",
          //layout: cellPipeline.getBindGroupLayout(0), //@group(0) in shader - this just auto generates the layout from the cellPipeline
          layout: bindGroupLayout, // No longer auto generating it
          entries: [{
            binding: 0, //@binding(0) in shader
            resource: { buffer: uniformBuffer } //Buffer resource assigned to this binding
          },{
            binding: 1, //@binding(1) in shader
            resource: { buffer: cellStateStorage[0] }
          }, {
            binding: 2,
            resource: { buffer: cellStateStorage[1] }
          }],
        }),
        device.createBindGroup({
          label: "Cell renderer bind group B",
          //layout: cellPipeline.getBindGroupLayout(0),
          layout: bindGroupLayout, // No longer auto generating it
          entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
          }, {
            binding: 1,
            resource: { buffer: cellStateStorage[1] }
          }, {
            binding: 2,
            resource: { buffer: cellStateStorage[0] }
          }]
        })
      ];

      let step = 0; // Track how many simulation steps have been run

      function updateGrid() {
        const encoder = device.createCommandEncoder();
        const computePass = encoder.beginComputePass();

        // Compute work
        computePass.setPipeline(simulationPipeline);
        computePass.setBindGroup(0, bindGroups[step % 2]);

        const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
        // DispatchWorkgroups numbers arenot the number of invocations! 
        // Instead, it's the number of workgroups to execute, as defined by the @workgroup_size in the shader

        computePass.end();
        
        step++;

        const pass = encoder.beginRenderPass({
          colorAttachments: [{
            //@location(0), see fragment shader
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0.15, g: 0.15, b: 0.15, a: 1 },
            storeOp: "store",
          }]
        });

        pass.setPipeline(cellPipeline);
        pass.setVertexBuffer(0, vertexBuffer);
        pass.setBindGroup(0, bindGroups[step % 2]); // Makes sure the bind group with all the uniform stuff is actually being used in the pass
        // The 0 passed as the first argument corresponds to the @group(0) in the shader code.
        // You're saying that each @binding that's part of @group(0) uses the resources in this bind group.
        pass.draw(
          vertices.length / 2, // 6 vertices
          GRID_SIZE * GRID_SIZE // 16 instances
        );
        pass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
      }

      // Schedule updateGrid() to run repeatedly
      setInterval(updateGrid, UPDATE_INTERVAL);