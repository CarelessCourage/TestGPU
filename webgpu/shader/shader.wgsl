//Structs are like TS interfaces
struct VertexInput {
    @location(0) pos: vec2f,
    @builtin(instance_index) instance: u32,
};

struct VertexOutput {
    @builtin(position) pos: vec4f,
    @location(2) uv: vec2f,
};

@group(0) @binding(0) var<uniform> time: u32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos * 1.0, 0, 1);
    output.uv = input.pos.xy * 0.5 + 0.5;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.uv, 1, 1);
}