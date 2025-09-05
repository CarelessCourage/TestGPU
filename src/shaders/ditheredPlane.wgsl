struct VertexInput {
    @location(0) pos: vec3<f32>,
    @location(1) norm : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) pos : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

struct ViewProjectionMatrix {
    matrix: mat4x4<f32>
};

@group(0) @binding(0) var<uniform> time: u32;
@group(0) @binding(1) var<uniform> intensity: f32; // used as dithering levels (>= 2)
@group(0) @binding(2) var<uniform> view: ViewProjectionMatrix;
@group(0) @binding(3) var tex: texture_2d<f32>;
@group(0) @binding(4) var texSampler: sampler;
// Monochrome controls
@group(0) @binding(5) var<uniform> monoEnabled: f32; // 0.0 = off, >0.5 = on
@group(0) @binding(6) var<uniform> monoColor: vec4<f32>; // tint color for mono

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.pos = view.matrix * vec4f(input.pos, 1.0);
    out.vUv = input.uv;
    return out;
}

// 4x4 Bayer matrix (values 0..15)
fn bayer4(x: i32, y: i32) -> f32 {
    let M = array<array<i32,4>,4>(
        array<i32,4>( 0,  8,  2, 10),
        array<i32,4>(12,  4, 14,  6),
        array<i32,4>( 3, 11,  1,  9),
        array<i32,4>(15,  7, 13,  5)
    );
    let v = M[y & 3][x & 3];
    // Normalize to [0,1): (n + 0.5) / 16.0 gives nicer distribution
    return (f32(v) + 0.5) / 16.0;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var color = textureSample(tex, texSampler, input.vUv);

    // Pixel position in framebuffer coordinates
    let px = i32(floor(input.pos.x));
    let py = i32(floor(input.pos.y));
    let T = bayer4(px, py); // threshold in [0,1)

    // Use "intensity" uniform as number of levels (min 2)
    let L = max(2.0, intensity);
    let denom = max(1.0, L - 1.0);

    // Ordered dithering per channel
    var rgb = color.rgb;
    rgb = floor(rgb * L + T) / denom;
    rgb = clamp(rgb, vec3f(0.0), vec3f(1.0));

    if (monoEnabled > 0.5) {
        // luminance (Rec. 601)
        let luma = dot(rgb, vec3f(0.299, 0.587, 0.114));
        rgb = vec3f(luma) * monoColor.rgb;
    }

    return vec4f(rgb, color.a);
}
