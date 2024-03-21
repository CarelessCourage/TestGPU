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

// Define constants for hashing algorithm
const HASH_SHIFT1 = 10u;
const HASH_SHIFT2 = 6u;
const HASH_SHIFT3 = 3u;
const HASH_SHIFT4 = 11u;
const HASH_SHIFT5 = 15u;

// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
fn hashBase(x: u32) -> u32 {
    var xx = x;
    xx = xx + (xx << HASH_SHIFT1);
    xx = xx ^ (xx >> HASH_SHIFT2);
    xx = xx + (xx << HASH_SHIFT3);
    xx = xx ^ (xx >> HASH_SHIFT4);
    xx = xx + (xx << HASH_SHIFT5);
    return xx;
}

// Compound versions of the hashing algorithm
fn hash1(v: vec2<u32>) -> u32 {
    return hashBase(v.x ^ hashBase(v.y));
}

fn hash2(v: vec3<u32>) -> u32 {
    return hashBase(v.x ^ hashBase(v.y) ^ hashBase(v.z));
}

fn hash3(v: vec4<u32>) -> u32 {
    return hashBase(v.x ^ hashBase(v.y) ^ hashBase(v.z) ^ hashBase(v.w));
}

// Construct a float with half-open range [0:1] using low 23 bits
fn floatConstruct(m: u32) -> f32 {
    let ieeeMantissa: u32 = 0x007FFFFF; // binary32 mantissa bitmask
    let ieeeOne: u32 = 0x3F800000; // 1.0 in IEEE binary32

    var mm = m;

    mm = mm & ieeeMantissa; // Keep only mantissa bits (fractional part)
    mm = mm | ieeeOne; // Add fractional part to 1.0

    var f: f32 = bitcast<f32>(mm); // Range [1:2]
    return f - 1.0; // Range [0:1]
}

// Pseudo-random value in half-open range [0:1]
fn random(x: f32) -> f32 {
    return floatConstruct(hashBase(bitcast<u32>(x)));
}

fn random1(v: vec2<f32>) -> f32 {
    return floatConstruct(hash1(vec2<u32>(bitcast<u32>(v.x), bitcast<u32>(v.y))));
}

fn random2(v: vec3<f32>) -> f32 {
    return floatConstruct(hash2(vec3<u32>(bitcast<u32>(v.x), bitcast<u32>(v.y), bitcast<u32>(v.z))));
}

fn random3(v: vec4<f32>) -> f32 {
    return floatConstruct(hash3(vec4<u32>(bitcast<u32>(v.x), bitcast<u32>(v.y), bitcast<u32>(v.z), bitcast<u32>(v.w))));
}

// Simple hash-based 3D noise function
fn bandNoise(p: vec3f) -> f32 {
    var p3 = fract(p * vec3f(0.013, 0.022, 0.033));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.x + p3.y) * p3.z);
}

//simplex nosie
fn mod289(x: vec2f) -> vec2f {
    return x - floor(x * (1. / 289.)) * 289.;
}

fn mod289_3(x: vec3f) -> vec3f {
    return x - floor(x * (1. / 289.)) * 289.;
}

fn permute3(x: vec3f) -> vec3f {
    return mod289_3(((x * 34.) + 1.) * x);
}

//  MIT License. © Ian McEwan, Stefan Gustavson, Munrocket
fn simplexNoise2(v: vec2f) -> f32 {
    let C = vec4(
        0.211324865405187, // (3.0-sqrt(3.0))/6.0
        0.366025403784439, // 0.5*(sqrt(3.0)-1.0)
        -0.577350269189626, // -1.0 + 2.0 * C.x
        0.024390243902439 // 1.0 / 41.0
    );

    // First corner
    var i = floor(v + dot(v, C.yy));
    let x0 = v - i + dot(i, C.xx);

    // Other corners
    var i1 = select(vec2(0., 1.), vec2(1., 0.), x0.x > x0.y);

    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    var x12 = x0.xyxy + C.xxzz;
    x12.x = x12.x - i1.x;
    x12.y = x12.y - i1.y;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation

    var p = permute3(permute3(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    var m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), vec3(0.));
    m *= m;
    m *= m;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)
    let x = 2. * fract(p * C.www) - 1.;
    let h = abs(x) - 0.5;
    let ox = floor(x + 0.5);
    let a0 = x - ox;

    // Normalize gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    // Compute final noise value at P
    let g = vec3(a0.x * x0.x + h.x * x0.y, a0.yz * x12.xz + h.yz * x12.yw);
    return 130. * dot(m, g);
}
//perlin

fn permute4(x: vec4f) -> vec4f { return ((x * 34. + 1.) * x) % vec4f(289.); }
fn fade2(t: vec2f) -> vec2f { return t * t * t * (t * (t * 6. - 15.) + 10.); }

fn perlinNoise2(P: vec2f) -> f32 {
    var Pi: vec4f = floor(P.xyxy) + vec4f(0., 0., 1., 1.);
    let Pf = fract(P.xyxy) - vec4f(0., 0., 1., 1.);
    Pi = Pi % vec4f(289.); // To avoid truncation effects in permutation
    let ix = Pi.xzxz;
    let iy = Pi.yyww;
    let fx = Pf.xzxz;
    let fy = Pf.yyww;
    let i = permute4(permute4(ix) + iy);
    var gx: vec4f = 2. * fract(i * 0.0243902439) - 1.; // 1/41 = 0.024...
    let gy = abs(gx) - 0.5;
    let tx = floor(gx + 0.5);
    gx = gx - tx;
    var g00: vec2f = vec2f(gx.x, gy.x);
    var g10: vec2f = vec2f(gx.y, gy.y);
    var g01: vec2f = vec2f(gx.z, gy.z);
    var g11: vec2f = vec2f(gx.w, gy.w);
    let norm = 1.79284291400159 - 0.85373472095314 *
        vec4f(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 = g00 * norm.x;
    g01 = g01 * norm.y;
    g10 = g10 * norm.z;
    g11 = g11 * norm.w;
    let n00 = dot(g00, vec2f(fx.x, fy.x));
    let n10 = dot(g10, vec2f(fx.y, fy.y));
    let n01 = dot(g01, vec2f(fx.z, fy.z));
    let n11 = dot(g11, vec2f(fx.w, fy.w));
    let fade_xy = fade2(Pf.xy);
    let n_x = mix(vec2f(n00, n01), vec2f(n10, n11), vec2f(fade_xy.x));
    let n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

fn perlinPack(uv: vec2f) -> f32 {
    var intensity = 7.0;
    var scale = 2.0;
    return perlinNoise2(uv * scale) * intensity;
}

fn acidZebra(uv: vec2f) -> f32 {
    var intensity = 1.1;
    var frequency = 0.5;
    return bandNoise(vec3f(uv, f32(time) * frequency)) * intensity;
}

fn vibeGlass(uv: vec2f) -> f32 {
    var vibe = 1.0 + sin(f32(time) * 0.1) * 0.5;
    var intensity = 1.0;
    var frequency = 0.5;
    var zebra = acidZebra(uv);
    return perlinPack(uv) * zebra * vibe;
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.pos = vec4f(input.pos, 0, 1);
    output.uv = input.pos.xy * 0.5 + 0.5;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var vibe = 1.0 + sin(f32(time) * 0.1) * 0.5;
    var color = vec4f(input.uv, input.uv.y, 1);
    var glass = vibeGlass(input.uv);
    var perlin = perlinPack(input.uv);
    var simplex = simplexNoise2(input.uv * 1000.0) * 0.1;
    return mix(color, vec4f(1, 1, 1, 1), perlin);
}