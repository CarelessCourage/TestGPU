// Vertex shader for refraction effect
@vertex
fn vertexMain(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>
) -> VertexOutput {
  var output: VertexOutput;
  
  // Transform position to world space
  let worldPos = modelMatrix * vec4<f32>(position, 1.0);
  let mvPosition = viewMatrix * worldPos;
  
  output.position = projectionMatrix * mvPosition;
  output.uv = uv;
  
  // Calculate eye vector (from camera to vertex)
  output.eyeVector = normalize(worldPos.xyz - cameraPosition);
  
  // Transform normal to world space
  let transformedNormal = normalMatrix * normal;
  output.worldNormal = normalize(transformedNormal);
  
  return output;
}

// Fragment shader for refraction effect
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  // Basic refraction parameters
  let iorRatio = 1.0 / 1.31; // Index of refraction ratio
  
  // Calculate UV coordinates from screen position
  let uv = input.position.xy / resolution.xy;
  
  // Calculate refraction vector
  let refractVec = refract(input.eyeVector, input.worldNormal, iorRatio);
  
  // Sample the background texture with refraction offset
  let color = textureSample(backgroundTexture, backgroundSampler, uv + refractVec.xy * 0.1);
  
  return color;
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) eyeVector: vec3<f32>,
  @location(2) worldNormal: vec3<f32>,
}

// Uniforms
@group(0) @binding(0) var<uniform> modelMatrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(3) var<uniform> normalMatrix: mat3x3<f32>;
@group(0) @binding(4) var<uniform> cameraPosition: vec3<f32>;
@group(0) @binding(5) var<uniform> resolution: vec2<f32>;

@group(1) @binding(0) var backgroundTexture: texture_2d<f32>;
@group(1) @binding(1) var backgroundSampler: sampler;
