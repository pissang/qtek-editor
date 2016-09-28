precision mediump float;
precision mediump int;
  #extension GL_OES_standard_derivatives:enable
#endif

#define PI 3.1415926535897932384626433832795
#define INVERSE_PI 1.0/3.1415926535897932384626433832795

uniform int modelId;
uniform int submeshStart;

uniform vec2 viewportResolution;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 projectionInverseMatrix;
uniform mat4 viewProjectionMatrix;
uniform mat4 viewProjectionInverseMatrix;
uniform mat4 modelViewProjectionMatrix;
uniform mat3 normalMatrix;

uniform float clipNear;
uniform float clipFar;
uniform vec3 cameraPositionWorldSpace;
varying vec2 vUV;
vec4 packUInt(const in int raw) {
  const vec4 bitShift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
  const float byteReciprocal = 1.0 / 255.0;

  vec4 res = bitShift * float(raw);
  res = floor(mod(res, vec4(256.0))) * byteReciprocal;
  return res;
}

vec4 packZeroToOneFloat(const in float raw) {
  //MAX_UINT = 2^32 - 1
  const float MAX_UINT = 4294967295.0;
  return packUInt(int(raw*MAX_UINT));
}

float linearizeGamma(const in float value) {
  const float screenGamma = 2.2;
  return pow(value, screenGamma);
}

vec3 linearizeGamma(const in vec3 color) {
  const float screenGamma = 2.2;
  return pow(color, vec3(screenGamma));
}

vec4 linearizeGamma(const in vec4 color) {
  const float screenGamma = 2.2;
  return pow(color, vec4(screenGamma));
}

const mat3 LOG_LUV_ENCODE_MAT = mat3(
  vec3(0.2209, 0.3390, 0.4184),
  vec3(0.1138, 0.6780, 0.7319),
  vec3(0.0102, 0.1130, 0.2969)
);

vec4 logLUVEncode(const in vec3 rgb) {
  vec4 res;
  vec3 xpYXYZ = LOG_LUV_ENCODE_MAT * rgb;
  xpYXYZ = max(xpYXYZ, vec3(1e-6));
  res.xy = xpYXYZ.xy / xpYXYZ.z;
  float logExponent = 2.0 * log2(xpYXYZ.y) + 127.0;
  res.w = fract(logExponent);
  const float INVERSE_BYTE = 1.0 / 255.0;
  res.z = (logExponent - (floor(res.w*255.0))*INVERSE_BYTE)*INVERSE_BYTE;
  return res;
}

const mat3 LOG_LUV_DECODE_MAT = mat3(
  vec3(6.0014, -2.7008, -1.7996),
  vec3(-1.3320, 3.1029, -5.7721),
  vec3(0.3008, -1.0882, 5.6268)
);

vec3 logLUVDecode(const in vec4 logLUV) {
  float logExponent = logLUV.z * 255.0 + logLUV.w;
  vec3 xpYXYZ;
  xpYXYZ.y = exp2((logExponent-127.0)*0.5);
  xpYXYZ.z = xpYXYZ.y / logLUV.y;
  xpYXYZ.x = logLUV.x * xpYXYZ.z;
  vec3 rgb = LOG_LUV_DECODE_MAT * xpYXYZ;
  return max(vec3(0.0), rgb);
}

vec3 rgbToYcocg(const in vec3 rgbColor) {
  const mat3 transform = mat3(0.25, 0.5, -0.25, 0.5, 0.0, 0.5, 0.25, -0.5, -0.25);
  return transform * rgbColor;
}

vec3 ycocgToRgb(const in vec3 ycocgColor) {
  vec3 rgb_color;

  rgb_color.r = ycocgColor[0] + ycocgColor[1] - ycocgColor[2];
  rgb_color.g = ycocgColor[0] + ycocgColor[2];
  rgb_color.b = ycocgColor[0] - ycocgColor[1] - ycocgColor[2];

  return rgb_color;
}

float checkerboard() {
  float swatch = -1.0;
  if (mod(gl_FragCoord.x, 2.0) != mod(gl_FragCoord.y, 2.0)) {
    swatch = 1.0;
  }
  return swatch;
}

struct gBufferComponents {
  vec3  diffuse;
  vec3  normal;

  float gloss;
  float metallic;
  float depth;
};

struct gBufferGeomComponents {
  vec3  normal;
  float depth;
};

vec4 encodeGBuffer(const in gBufferComponents components, const in float clipFar) {
  vec4 res;

  vec3 diffuseYcocg = rgbToYcocg(components.diffuse);
  vec2 diffuseYc = checkerboard() > 0.0 ? diffuseYcocg.xy : diffuseYcocg.xz;
  diffuseYc.y += 0.5;

  //Divide by clip far * 2.0 to sneak distance into a 0 to 1 range
  //The * 2.0 avoids calculating the diagonal length of the view frustrum. We just need a scale factor that will always result in a length of less than 1.
  float depth = components.depth / (clipFar*2.0);

  //Scale normal from -1 to 1 to 0 to 1 range
  vec3 normal = components.normal * 0.5 + 0.5;

  //Scale down float components to 0 to 0.5 so that if float components can still be seperated off with floor() in the event of float == 1.0
  res = vec4(normal, depth) * 0.5;

  res.xyz += floor(vec3(diffuseYc, components.gloss) * 255.0);

  //If not metallic negate depth. Easy to extract bool as sign();
  res.w *= components.metallic;

  return res;
}

gBufferComponents decodeGBuffer(const in sampler2D gBufferSampler,
                                const in vec2 texCoords,
                                const in vec2 resolution,
                                const in float clipFar)
{
  gBufferComponents res;

  vec4 encodedGBuffer = texture2D(gBufferSampler, texCoords).rgba;

  vec3 floatComponents = fract(encodedGBuffer.xyz) * 2.0;

  res.normal = floatComponents.xyz * 2.0 - 1.0;
  res.depth = abs(encodedGBuffer.w) * 4.0 * clipFar;
  res.metallic = sign(encodedGBuffer.w);

  const float byteToFloat = 1.0/255.0;
  vec3 byteComponents = floor(encodedGBuffer.xyz) * byteToFloat;

  res.gloss = byteComponents.z;

  vec3 diffuseYcocg;
  diffuseYcocg.x = byteComponents.x;

  float pixelOffsetCoordsX = 1.0 / resolution.x;
  float offsetDir = checkerboard();
  vec2 diffuseChroma;
  diffuseChroma.x = byteComponents.y - 0.5;
  diffuseChroma.y = texture2D(gBufferSampler, texCoords + vec2(pixelOffsetCoordsX*offsetDir, 0.0)).y;
  diffuseChroma.y = floor(diffuseChroma.y) * byteToFloat - 0.5;
  diffuseYcocg.yz = offsetDir > 0.0 ? diffuseChroma.xy : diffuseChroma.yx;

  res.diffuse = ycocgToRgb(diffuseYcocg);

  return res;
}

gBufferGeomComponents decodeGBufferGeom(const in sampler2D gBufferSampler,
                                        const in vec2 texCoords,
                                        const in float clipFar)
{
  gBufferGeomComponents res;

  vec4 encodedGBuffer  = texture2D(gBufferSampler, texCoords).rgba;
  vec3 floatComponents = fract(encodedGBuffer.xyz) * 2.0;

  res.normal = floatComponents.xyz * 2.0 - 1.0;
  res.depth  = abs(encodedGBuffer.w) * 4.0 * clipFar;

  return res;
}

float decodeGBufferDepth(const in sampler2D gBufferSampler,
                         const in vec2 texCoords,
                         const in float clipFar)
{
  return abs(texture2D(gBufferSampler, texCoords).w) * 4.0 * clipFar;
}

vec2 worldNormalToParaboloidTexCoords(const in vec3 normal, const in float hemisphere) {
  vec2 texCoords;
  float a = -hemisphere/(2.0);
  float b = 1.0+(hemisphere*normal.z);

  texCoords.s = a * (normal.x/b) + 0.5;
  texCoords.t = a * (normal.y/b) + 0.5;

  return texCoords;
}

vec3 paraboloidTexCoordsToWorldNormal(const in vec2 texCoords, const in float hemisphere) {
  vec3 res;

  vec2 scaled = texCoords * 2.0 - 1.0;
  float s2 = scaled.s*scaled.s;
  float t2 = scaled.t*scaled.t;
  float s2AddT2 = s2 + t2;
  float inverseS2AddT2Add1 = 1.0 / (s2AddT2+1.0);

  res.x = hemisphere * (2.0 * scaled.s) * inverseS2AddT2Add1;
  res.y = hemisphere * (2.0 * scaled.t) * inverseS2AddT2Add1;
  res.z = hemisphere * (-1.0 + s2AddT2) * inverseS2AddT2Add1;

  return normalize(res);
}

// SAO (Scalable Ambient Obscurance) fragment shader
//
// Converts the g-buffer to an occlusion buffer which estimates local ambient
// occlusion at each fragment in screen-space.
//
// For details on the technique itself, see: McGuire et al [12]
// http://graphics.cs.williams.edu/papers/SAOHPG12/McGuire12SAO-talk.pdf

// total number of samples at each fragment
#define NUM_SAMPLES           {{ numSamples }}

#define NUM_SPIRAL_TURNS      {{ numSpiralTurns }}

#define USE_ACTUAL_NORMALS    {{ useActualNormals }}

#define VARIATION             {{ variation }}

uniform sampler2D sGBuffer;
uniform sampler2D sNoise;

uniform float uFOV;
uniform float uIntensity;
uniform vec2  uNoiseScale;
uniform float uSampleRadiusWS;
uniform float uBias;

// reconstructs view-space unit normal from view-space position
vec3 reconstructNormalVS(vec3 positionVS) {
  return normalize(cross(dFdx(positionVS), dFdy(positionVS)));
}

vec3 getPositionVS(vec2 uv) {
  float depth = decodeGBufferDepth(sGBuffer, uv, clipFar);

  vec2 uv2  = uv * 2.0 - vec2(1.0);
  vec4 temp = viewProjectionInverseMatrix * vec4(uv2, -1.0, 1.0);
  vec3 cameraFarPlaneWS = (temp / temp.w).xyz;

  vec3 cameraToPositionRay = normalize(cameraFarPlaneWS - cameraPositionWorldSpace);
  vec3 originWS = cameraToPositionRay * depth + cameraPositionWorldSpace;
  vec3 originVS = (viewMatrix * vec4(originWS, 1.0)).xyz;

  return originVS;
}

// returns a unit vector and a screen-space radius for the tap on a unit disk
// (the caller should scale by the actual disk radius)
vec2 tapLocation(int sampleNumber, float spinAngle, out float radiusSS) {
  // radius relative to radiusSS
  float alpha = (float(sampleNumber) + 0.5) * (1.0 / float(NUM_SAMPLES));
  float angle = alpha * (float(NUM_SPIRAL_TURNS) * 6.28) + spinAngle;

  radiusSS = alpha;
  return vec2(cos(angle), sin(angle));
}

vec3 getOffsetPositionVS(vec2 uv, vec2 unitOffset, float radiusSS) {
  uv = uv + radiusSS * unitOffset * (1.0 / viewportResolution);

  return getPositionVS(uv);
}

float sampleAO(vec2 uv, vec3 positionVS, vec3 normalVS, float sampleRadiusSS,
               int tapIndex, float rotationAngle)
{
  const float epsilon = 0.01;
  float radius2 = uSampleRadiusWS * uSampleRadiusWS;

  // offset on the unit disk, spun for this pixel
  float radiusSS;
  vec2 unitOffset = tapLocation(tapIndex, rotationAngle, radiusSS);
  radiusSS *= sampleRadiusSS;

  vec3 Q = getOffsetPositionVS(uv, unitOffset, radiusSS);
  vec3 v = Q - positionVS;

  float vv = dot(v, v);
  float vn = dot(v, normalVS) - uBias;

#if VARIATION == 0

  // (from the HPG12 paper)
  // Note large epsilon to avoid overdarkening within cracks
  return float(vv < radius2) * max(vn / (epsilon + vv), 0.0);

#elif VARIATION == 1 // default / recommended

  // Smoother transition to zero (lowers contrast, smoothing out corners). [Recommended]
  float f = max(radius2 - vv, 0.0) / radius2;
  return f * f * f * max(vn / (epsilon + vv), 0.0);

#elif VARIATION == 2

  // Medium contrast (which looks better at high radii), no division.  Note that the
  // contribution still falls off with radius^2, but we've adjusted the rate in a way that is
  // more computationally efficient and happens to be aesthetically pleasing.
  float invRadius2 = 1.0 / radius2;
  return 4.0 * max(1.0 - vv * invRadius2, 0.0) * max(vn, 0.0);

#else

  // Low contrast, no division operation
  return 2.0 * float(vv < radius2) * max(vn, 0.0);

#endif
}

void main() {
  vec3 originVS = getPositionVS(vUV);

#if USE_ACTUAL_NORMALS
  gBufferGeomComponents gBufferValue = decodeGBufferGeom(sGBuffer, vUV, clipFar);

  vec3 normalVS = gBufferValue.normal;
#else
  vec3 normalVS = reconstructNormalVS(originVS);
#endif

  vec3 sampleNoise = texture2D(sNoise, vUV * uNoiseScale).xyz;

  float randomPatternRotationAngle = 2.0 * PI * sampleNoise.x;

  float radiusSS  = 0.0; // radius of influence in screen space
  float radiusWS  = 0.0; // radius of influence in world space
  float occlusion = 0.0;

  // TODO (travis): don't hardcode projScale
  float projScale = 40.0;//1.0 / (2.0 * tan(uFOV * 0.5));
  radiusWS = uSampleRadiusWS;
  radiusSS = projScale * radiusWS / originVS.y;

  for (int i = 0; i < NUM_SAMPLES; ++i) {
    occlusion += sampleAO(vUV, originVS, normalVS, radiusSS, i,
                          randomPatternRotationAngle);
  }

  occlusion = 1.0 - occlusion / (4.0 * float(NUM_SAMPLES));
  occlusion = clamp(pow(occlusion, 1.0 + uIntensity), 0.0, 1.0);
  gl_FragColor = vec4(occlusion, occlusion, occlusion, 1.0);
}