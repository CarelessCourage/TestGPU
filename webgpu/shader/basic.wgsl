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

@group(0) @binding(0) var<uniform> time: u32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos, 1.0);
    output.uv = input.uv;
    return output;
}

const ambientLightFactor: f32 = 0.25; 

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let lightPos: vec3<f32> = vec3<f32>(0.0, 0.0, -0.9);
    let lightDirection: vec3<f32> = normalize(lightPos - input.pos.xyz);
    let lightFactor: f32 = dot(lightDirection, input.norm) + 0.5;

    let lightingFactor: f32 = max(min(lightFactor, 1.0), ambientLightFactor);
    var color: vec3<f32> = vec3f(input.uv.x, input.uv.y, 1.0) * 0.5 + 0.5;

    return vec4<f32>(color * lightingFactor, 1.0);
}

// struct Uniforms {     // 4x4 transform matrices
//     transform : mat4x4<f32>,    // translate AND rotate
//     rotate : mat4x4<f32>,       // rotate only
// };

// struct Camera {     // 4x4 transform matrix
//     matrix : mat4x4<f32>,
// };

// // output struct of this vertex shader
// struct VertexOutput {
//     @builtin(position) pos : vec4<f32>,
//     @location(0) fragColor : vec3<f32>,
//     @location(1) fragNorm : vec3<f32>,
//     @location(2) uv : vec2<f32>,
//     @location(3) fragPos : vec3<f32>,
// };

// // input struct according to vertex buffer stride
// struct VertexInput {
//     @location(0) position : vec3<f32>,
//     @location(1) norm : vec3<f32>,
//     @location(2) uv : vec2<f32>,
// };

// @vertex
// fn vertexMain(input: VertexInput) -> VertexOutput {
//     var output: VertexOutput;
//     var color : vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);

//     output.uv = input.uv;
//     output.pos = vec4f(input.position, 1.0);
//     output.fragColor = color;
//     output.fragNorm = input.norm;
//     output.fragPos = input.position;                           
//     return output;
// }

// struct FragmentInput {              // output from vertex stage shader
//     @location(0) fragColor : vec3<f32>,
//     @location(1) fragNorm : vec3<f32>,
//     @location(2) uv : vec2<f32>,
//     @location(3) fragPos : vec3<f32>,
// };

// // constants for light
// const ambientLightFactor : f32 = 0.25;     // ambient light

// @fragment
// fn fragmentMain(input : FragmentInput) -> @location(0) vec4<f32> {
//     let lightPos : vec3<f32> = vec3<f32>(0.0, 0.0, 3.0);
//     let lightDirection: vec3<f32> = normalize(lightPos - input.fragPos);


//     // lambert factor
//     let lambertFactor : f32 = dot(lightDirection, input.fragNorm);

//     var lightFactor: f32 = 0.0;
//     lightFactor = lambertFactor;

//     let lightingFactor: f32 = max(min(lightFactor, 1.0), ambientLightFactor);

//     return vec4<f32>(input.fragColor * lightingFactor, 1.0);
// }