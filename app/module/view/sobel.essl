// https://docs.unity3d.com/Manual/script-EdgeDetectEffectNormals.html
@export sobel.fragment

uniform sampler2D normalTex;
uniform sampler2D depthTex;

uniform vec3 color : [0.0, 0.775, 0.189];

uniform vec2 textureSize;

varying vec2 v_Texcoord;

uniform mat4 projection;

uniform float depthSensitivity: 0.3;
uniform float normalSensitivity: 0.4;


float getLinearDepth(vec2 coord) {
    float depth = texture2D(depthTex, coord).r * 2.0 - 1.0;
    // Linear depth
    return projection[3][2] / (depth * projection[2][3] - projection[2][2]);
}

void main ()
{
    vec2 offset = vec2(0.5 / textureSize.x, 0.5 / textureSize.y);

    vec2 coord;
    // top left
    coord = v_Texcoord+vec2(-offset.x, -offset.y);
    vec4 topLeft = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // top
    coord = v_Texcoord+vec2(-offset.x, -offset.y);
    vec4 top = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // top right
    coord = v_Texcoord+vec2(offset.x, -offset.y);
    vec4 topRight = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // left
    coord = v_Texcoord+vec2(-offset.x, 0);
    vec4 left = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // // center
    vec4 center = vec4(texture2D(normalTex, v_Texcoord).xyz, getLinearDepth(v_Texcoord));
    // right
    coord = v_Texcoord+vec2(offset.x, 0);
    vec4 right = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // bottom left
    coord = v_Texcoord+vec2(-offset.x, offset.y);
    vec4 bottomLeft = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // bottom
    coord = v_Texcoord+vec2(0, offset.y);
    vec4 bottom = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));
    // bottom right
    coord = v_Texcoord+offset;
    vec4 bottomRight = vec4(texture2D(normalTex, coord).xyz, getLinearDepth(coord));

    vec3 h = -topLeft.xyz -2.0*top.xyz-topRight.xyz+bottomLeft.xyz+2.0*bottom.xyz+bottomRight.xyz;
    vec3 v = -bottomLeft.xyz-2.0*left.xyz-topLeft.xyz+bottomRight.xyz+2.0*right.xyz+topRight.xyz;

    float diffN = smoothstep(normalSensitivity, 1.0, sqrt(dot(h, h) + dot(v, v)));

    float avgZ = topLeft.w + top.w + topRight.w + left.w + right.w + bottomLeft.w + bottomRight.w + bottom.w;
    avgZ /= 8.0;
    float diffD = smoothstep(0.0, depthSensitivity, abs(center.w - avgZ));

    gl_FragColor = vec4(max(diffD, diffN) * color, 1.0);
}

@end