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

//@binding(0) @group(0) var<uniform> modelViewProjectionMatrix: mat4x4<f32>;

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
    output.uv = input.uv;
    output.norm = input.norm;
    return output;
}

fn circle(uv: vec2<f32>, center: vec2<f32>, radius: f32, falloff: f32) -> f32 {
    let localUV = (uv - center) / radius;
    let dist = distance(uv, center);
    return smoothstep(radius, radius - falloff, dist);
}

fn coloredCircle(uv: vec2<f32>, center: vec2<f32>, radius: f32, falloff: f32) -> vec4<f32> {
    let centeredUV = (uv - 0.5) * 2.0;
    let localUV = (centeredUV / radius) + center;
    let remappedValue = (localUV + 1.0) / 2.0; // Remap the value to be between 0 and 1 instead of -1 and 1
    let fade = circle(centeredUV, center, radius, falloff);
    return vec4<f32>(remappedValue.r, remappedValue.g, remappedValue.g, fade) * fade;
}

fn exampleLoop() {
    var myVec3Array: array<vec3<f32>, 5>; // Declare an array of 5 vec3s
    myVec3Array[0] = vec3<f32>(1.0, 2.0, 3.0); // Assign a value to the first element of the array
    myVec3Array[1] = vec3<f32>(4.0, 5.0, 6.0); // Assign a value to the second element of the array
    
    var i = 0;
    while (i < 5) {
        // Access array element
        let value = myVec3Array[i];
        // Your code here
        i = i + 1;
    }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let fade = coloredCircle(input.uv, vec2f(0.0, 0.0), 0.25, 0.02);
    let fade2 = coloredCircle(input.uv, vec2f(0.4, 0.0), 0.25, 0.02);
    let fade3 = coloredCircle(input.uv, vec2f(-0.4, 0.0), 0.25, 0.02);

    let uvmap = vec4<f32>(input.uv, 0.0, 1.0);

    let mix1 = mix(fade3, fade, fade.a);
    let mix2 = mix(fade2, mix1, mix1.a);

    return mix2;
}
