@export ssao.fragment

uniform sampler2D normalTex;
uniform sampler2D depthTex;

uniform sampler2D noiseTex;

uniform vec2 normalTexSize;

uniform vec2 noiseTexSize;

uniform vec2 viewportSize;

uniform mat4 projection;

uniform mat4 projectionInv;

uniform mat4 viewInverseTranspose;

uniform vec3 kernel[KERNEL_SIZE];

uniform float radius : 1.5;

uniform float power : 2;

varying vec2 v_Texcoord;

#ifdef DEPTH_ENCODED
@import qtek.util.decode_float
#endif

vec3 ssaoEstimator(in mat3 kernelBasis, in vec3 originPos) {
    float occlusion = 0.0;

    for (int i = 0; i < KERNEL_SIZE; i++) {
        vec3 samplePos = kernelBasis * kernel[i];
        samplePos = samplePos * radius + originPos;

        vec4 texCoord = projection * vec4(samplePos, 1.0);
        texCoord.xy /= texCoord.w;

        vec4 depthTexel = texture2D(depthTex, texCoord.xy * 0.5 + 0.5);
#ifdef DEPTH_ENCODED
        depthTexel.rgb /= depthTexel.a;
        float sampleDepth = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
        float sampleDepth = depthTexel.r * 2.0 - 1.0;
#endif

        sampleDepth = projection[3][2] / (sampleDepth * projection[2][3] - projection[2][2]);

        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(originPos.z - sampleDepth));
        occlusion += rangeCheck * step(samplePos.z, sampleDepth);
    }
    occlusion = 1.0 - occlusion / float(KERNEL_SIZE);
    return vec3(pow(occlusion, power));
}

void main()
{

    vec4 tex = texture2D(normalTex, v_Texcoord);

    // Is empty
    if (dot(tex.rgb, vec3(1.0)) == 0.0) {
        discard;
    }

    vec3 N = tex.rgb * 2.0 - 1.0;

    // Convert to view space
    N = (viewInverseTranspose * vec4(N, 0.0)).xyz;


    vec4 depthTexel = texture2D(depthTex, v_Texcoord);
#ifdef DEPTH_ENCODED
    depthTexel.rgb /= depthTexel.a;
    float z = decodeFloat(depthTexel) * 2.0 - 1.0;
#else
    float z = depthTexel.r * 2.0 - 1.0;
#endif

    vec4 projectedPos = vec4(v_Texcoord * 2.0 - 1.0, z, 1.0);
    vec4 p4 = projectionInv * projectedPos;

    vec3 position = p4.xyz / p4.w;

    vec2 noiseTexCoord = normalTexSize / vec2(noiseTexSize) * v_Texcoord;
    vec3 rvec = texture2D(noiseTex, noiseTexCoord).rgb * 2.0 - 1.0;

    // Tangent
    vec3 T = normalize(rvec - N * dot(rvec, N));
    // Bitangent
    vec3 BT = normalize(cross(N, T));
    mat3 kernelBasis = mat3(T, BT, N);

    gl_FragColor = vec4(vec3(ssaoEstimator(kernelBasis, position)), 1.0);
}

@end


@export ssao.blur_h

#define EDGE_SHARPNESS 1.0

uniform sampler2D colorTex;
uniform sampler2D depthTex;

varying vec2 v_Texcoord;

uniform vec2 textureSize;
uniform float blurSize : 1.0;

void main()
{
    @import qtek.compositor.kernel.gaussian_13

    vec4 centerDepthTexel = texture2D(depthTex, v_Texcoord);

    float off = blurSize / textureSize.x;
    vec2 coord = v_Texcoord;

    vec4 sum = vec4(0.0);
    float weightAll = 0.0;

    float centerDepth = centerDepthTexel.r;
    for (int i = 0; i < 13; i++) {
        vec2 coord = vec2(clamp(v_Texcoord.x + float(i - 6) * off, 0.0, 1.0), v_Texcoord.y);
        // Use depth in bilateral filter instead normal.
        // Use normal will cause jitter in the corner.
        float w = gaussianKernel[i] * max(0.0, 1.0 - float(EDGE_SHARPNESS) * 2000.0 * abs(centerDepth - texture2D(depthTex, coord).r));
        weightAll += w;
        sum += texture2D(colorTex, coord) * w;
    }

    gl_FragColor = sum / weightAll;
}

@end
@export ssao.blur_v

#define EDGE_SHARPNESS 1.0

uniform sampler2D colorTex;
uniform sampler2D depthTex;

varying vec2 v_Texcoord;

uniform vec2 textureSize;
uniform float blurSize : 1.0;

void main()
{
    @import qtek.compositor.kernel.gaussian_13

    vec4 centerDepthTexel = texture2D(depthTex, v_Texcoord);
    // Add 0.1000 bias to filling holes from missed rays.
    float off = blurSize / textureSize.y;
    vec2 coord = v_Texcoord;

    vec4 sum = vec4(0.0);
    float weightAll = 0.0;

    float centerDepth = centerDepthTexel.r;

    for (int i = 0; i < 13; i++) {
        vec2 coord = vec2(v_Texcoord.x, clamp(v_Texcoord.y + float(i - 6) * off, 0.0, 1.0));
        float w = gaussianKernel[i] * max(0.0, 1.0 - float(EDGE_SHARPNESS) * 2000.0 * abs(centerDepth - texture2D(depthTex, coord).r));
        weightAll += w;
        sum += texture2D(colorTex, coord) * w;
    }

   gl_FragColor = sum / weightAll;
}

@end