function quantity(val) {
    return Math.pow(10, Math.floor(Math.log(val) / Math.LN10));
}

function BooleanType(name, title, val) {
    return {
        title: title,
        type: 'boolean',
        value: !!val
    };
}

function StringType(name, title, val) {
    return {
        name: name,
        title: title,
        type: 'string',
        value: val
    };
}

function TextureType(name, title, src, textureType) {
    return {
        name: name,
        title: title,
        type: 'texture',
        textureType: textureType || '2d',
        value: src || ''
    };
}

function RangeType(name, title, val, min, max, step) {
    min = min || 0;
    max = max == null ? 1 : max;
    return {
        name: name,
        title: title,
        type: 'range',
        min: min,
        max: max,
        step: step || (quantity(max - min) / 100),
        value: val || 0
    };
}

function ColorType(name, title, val) {
    return {
        name: name,
        title: title,
        type: 'color',
        value: val || ''
    };
}

function NumberType(name, title, val, step) {
    return {
        name: name,
        title: title,
        type: 'number',
        value: val || 0,
        step: step || quantity(step) / 10
    };
}

var store = {

    // textureRootPath: 'http://localhost/baidu-screen/asset/texture/zhanqu2/',
    textureRootPath: window.location.origin + '/qtek-editor/asset/model/kitchen/texture/',

    useFreeCamera: false,

    enableSsao: true,

    enableSsr: true,

    currentClip: 0,

    clips: [],

    renderStat: {
        renderTime: 0,
        vertexCount: 0,
        drawCallCount: 0
    },

    currentCamera: {
        position: null,
        rotation: null
    },

    ssao: {
        radius: new RangeType('radius', 'Radius', 0.5, 0, 2, 0.005),
        kernelSize: new RangeType('kernelSize', 'Kernel Size', 64, 0, 256, 1),
        power: new RangeType('power', 'Power', 0.2, -5, 5, 0.01),
        scale: new RangeType('scale', 'Scale', 0.5, 0, 5, 0.01),
        bias: new RangeType('bias', 'Bias', 5e-4, 1e-4, 2e-3),
        epsilon: new RangeType('epsilon', 'Epsilon', 0.1, 1e-3, 0.2)
    },

    ssr: {
        maxIteration: new RangeType('maxIteration', 'Max Iteration', 32, 1, 256, 1),
        maxBinaryIteration: new RangeType('maxBinaryIteration', 'Max BinaryIteration', 5, 0, 64, 1),
        maxRayDistance: new RangeType('maxRayDistance', 'Max Ray Distance', 10, 0, 50),
        pixelStride: new RangeType('pixelStride', 'Pixel Stride', 16, 1, 50, 1),
        pixelStrideZCutoff: new RangeType('pixelStrideZCutoff', 'Pixel Stride Z Cutoff', 50, 1, 1000, 1),
        eyeFadeStart: new RangeType('eyeFadeStart', 'Eye Fade Start', 0.5, 0, 1),
        eyeFadeEnd: new RangeType('eyeFadeEnd', 'Eye Fade End', 1, 0, 1),
        minGlossiness: new RangeType('minGlossiness', 'Min Glossiness', 0.4, 0, 1),
        zThicknessThreshold: new RangeType('zThicknessThreshold', 'Z Thickness Threshold', 0.1, 0, 2)
    },

    inspectorMaterial: [
        new StringType('materialId', 'Material ID'),

        new ColorType('color', 'Base Color', '#fff'),
        new RangeType('metalness', 'Metalness', 0, 0, 1),
        new RangeType('glossiness', 'Glossiness', 0, 0, 1),

        new RangeType('alpha', 'Alpha', 0, 0, 1),

        new ColorType('emission', 'Emission', '#000'),
        new RangeType('emissionIntensity', 'Emission Intensity', 0, 0, 50),

        new NumberType('uvRepeat0', 'U Repeat', 1),
        new NumberType('uvRepeat1', 'V Repeat', 1),

        new TextureType('diffuseMap', 'Diffuse Map'),
        new TextureType('normalMap', 'Normal Map'),
        new TextureType('roughnessMap', 'Roughness Map'),
        new TextureType('metalnessMap', 'Metalness Map'),
        new TextureType('emissiveMap', 'Emissive Map')

        // new TextureType('environmentMap', 'Environment Map')
    ]
};

store.inspectorMaterial.forEach(function (mat) {
    if (mat.type === 'texture') {
        mat.textureRootPath = store.textureRootPath;
    }
});

export default store;