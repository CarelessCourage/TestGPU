//Structs are like TS interfaces
struct VertexInput {
    @location(0) pos: vec3<f32>,
    @location(1) norm : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

// output struct of this vertex shader
struct VertexOutput {
    @builtin(position) pos : vec4<f32>,
    @location(1) norm : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct ViewProjectionMatrix {
    matrix: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> time: u32;
@group(0) @binding(1) var<uniform> intensity: f32;
@group(0) @binding(2) var<uniform> view: ViewProjectionMatrix;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var position = view.matrix * vec4f(input.pos, 1.0);
    var output: VertexOutput;
    output.pos = position;
    output.norm = input.norm;
    output.uv = input.uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.uv.x, input.uv.y, 1.0, 1.0) * 0.5 + 0.5;
}
