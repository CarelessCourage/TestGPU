//Structs are like TS interfaces
struct VertexInput {
    @location(0) pos: vec3f,
    @location(1) norm : vec3f,
    @location(2) uv : vec2f,
};

// output struct of this vertex shader
struct VertexOutput {
    @builtin(position) pos : vec4f,
    @location(1) norm : vec3f,
    @location(2) uv : vec2f,
};

struct ViewProjectionMatrix {
    matrix: mat4x4f
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

fn circle(uv: vec2f, center: vec2f, radius: f32, falloff: f32) -> f32 {
    let localUV = (uv - center) / radius;
    let dist = distance(uv, center);
    return smoothstep(radius, radius - falloff, dist);
}

fn coloredCircle(uv: vec2f, center: vec2f, radius: f32, falloff: f32) -> vec4f {
    let centeredUV = (uv - 0.5) * 2.0;
    let localUV = (centeredUV / radius) + center * -3.0; // would be nice to know why -3.0. Dunno.  2.0 makes sense. 3.0? -?
    let remappedValue = (localUV + 1.0) / 2.0; // Remap the value to be between 0 and 1 instead of -1 and 1
    let fade = circle(centeredUV, center, radius, falloff);
    return vec4f(remappedValue.r, remappedValue.g, remappedValue.g, fade) * fade;
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
    let fade3 = coloredCircle(input.uv, vec2f(0.4, 0.0), 0.25, 0.02);
    let fade2 = coloredCircle(input.uv, vec2f(0.0, 0.0), 0.25, 0.02);
    let fade1 = coloredCircle(input.uv, vec2f(-0.4, 0.0), 0.25, 0.02);

    let uvmap = vec4f(input.uv, input.uv.y, 1.0);

    let mix1 = mix(fade1, fade2, fade2.a);
    let mix2 = mix(mix1, fade3, fade3.a);

    return mix2;
}
