// Advanced dispersion shader with chromatic aberration
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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  // Dispersion parameters
  let iorRatioRed = 1.0 / uniforms.iorR;
  let iorRatioGreen = 1.0 / uniforms.iorG;
  let iorRatioBlue = 1.0 / uniforms.iorB;
  
  // Calculate UV coordinates from screen position
  let uv = input.position.xy / uniforms.resolution.xy;
  let normal = input.worldNormal;
  
  var color = vec3<f32>(0.0);
  
  // Sample dispersion with multiple samples for smoother effect
  for (var i = 0; i < SAMPLES; i++) {
    let slide = f32(i) / f32(SAMPLES) * 0.1;
    
    // Calculate individual refraction vectors for each color channel
    let refractVecR = refract(input.eyeVector, normal, iorRatioRed);
    let refractVecG = refract(input.eyeVector, normal, iorRatioGreen);
    let refractVecB = refract(input.eyeVector, normal, iorRatioBlue);
    
    // Sample each color channel with different refraction offsets
    let r = textureSample(backgroundTexture, backgroundSampler, 
      uv + refractVecR.xy * (uniforms.refractPower + slide * 1.0) * uniforms.chromaticAberration).r;
    let g = textureSample(backgroundTexture, backgroundSampler, 
      uv + refractVecG.xy * (uniforms.refractPower + slide * 2.0) * uniforms.chromaticAberration).g;
    let b = textureSample(backgroundTexture, backgroundSampler, 
      uv + refractVecB.xy * (uniforms.refractPower + slide * 3.0) * uniforms.chromaticAberration).b;
    
    color.r += r;
    color.g += g;
    color.b += b;
  }
  
  // Normalize by number of samples
  color /= f32(SAMPLES);
  
  // Apply saturation
  color = saturate(color, uniforms.saturation);
  
  // Apply lighting effects
  let lightingFactor = calculateLighting(input.eyeVector, input.worldNormal);
  color *= lightingFactor;
  
  // Apply Fresnel effect
  let fresnelFactor = calculateFresnel(input.eyeVector, input.worldNormal);
  color = mix(color, vec3<f32>(1.0), fresnelFactor * uniforms.fresnelPower);
  
  return vec4<f32>(color, 1.0);
}

// Saturation function
fn saturate(rgb: vec3<f32>, intensity: f32) -> vec3<f32> {
  let luminance = vec3<f32>(0.2125, 0.7154, 0.0721);
  let grayscale = vec3<f32>(dot(rgb, luminance));
  return mix(grayscale, rgb, intensity);
}

// Lighting calculation (Blinn-Phong)
fn calculateLighting(eyeVector: vec3<f32>, worldNormal: vec3<f32>) -> f32 {
  let lightVector = normalize(-uniforms.lightPosition);
  let halfVector = normalize(eyeVector + lightVector);
  
  let NdotL = dot(worldNormal, lightVector);
  let NdotH = dot(worldNormal, halfVector);
  let NdotH2 = NdotH * NdotH;
  
  let kDiffuse = max(0.0, NdotL);
  let kSpecular = pow(NdotH2, uniforms.shininess);
  
  return kSpecular + kDiffuse * uniforms.diffuseness;
}

// Fresnel effect
fn calculateFresnel(eyeVector: vec3<f32>, worldNormal: vec3<f32>) -> f32 {
  let fresnelFactor = abs(dot(eyeVector, worldNormal));
  let inverseFresnel = 1.0 - fresnelFactor;
  return pow(inverseFresnel, uniforms.fresnelPower);
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) eyeVector: vec3<f32>,
  @location(2) worldNormal: vec3<f32>,
}

struct DisperseUniforms {
  iorR: f32,
  iorG: f32,
  iorB: f32,
  refractPower: f32,
  chromaticAberration: f32,
  saturation: f32,
  shininess: f32,
  diffuseness: f32,
  fresnelPower: f32,
  resolution: vec2<f32>,
  lightPosition: vec3<f32>,
}

// Uniforms
@group(0) @binding(0) var<uniform> modelMatrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<uniform> projectionMatrix: mat4x4<f32>;
@group(0) @binding(3) var<uniform> normalMatrix: mat3x3<f32>;
@group(0) @binding(4) var<uniform> cameraPosition: vec3<f32>;

@group(1) @binding(0) var<uniform> uniforms: DisperseUniforms;
@group(1) @binding(1) var backgroundTexture: texture_2d<f32>;
@group(1) @binding(2) var backgroundSampler: sampler;

const SAMPLES: i32 = 8;
