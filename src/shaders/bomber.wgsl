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
    return vec4<f32>(remappedValue.r, remappedValue.g, remappedValue.g, 1.0) * fade;
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
    let additive = fade;

    let color = vec4<f32>(1.0, 0.0, 0.0, 1.0);
    let dot = vec4<f32>(additive.r, additive.g, additive.b, 1.0);
    let uvmap = vec4<f32>(input.uv, 0.0, 1.0);

    // Color the fragment based on the fade-off
    return dot;
}
