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
        step: step || quantity(val) / 100
    };
}

function VectorType(name, title, val, step) {
    return {
        name: name,
        title: title,
        type: 'vector',
        value: val || [],
        step: step || quantity(val[0]) / 100
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

    // Scene tree
    sceneTree: {
        selected: '',
        root: null
    },

    ssao: {
        radius: new RangeType('radius', 'Radius', 0.5, 0, 2, 0.005),
        kernelSize: new RangeType('kernelSize', 'Kernel Size', 64, 1, 256, 1),
        power: new RangeType('power', 'Power', 0.2, -5, 5, 0.01),
        scale: new RangeType('scale', 'Scale', 0.5, 0, 5, 0.01),
        blurSize: new RangeType('blurSize', 'Blur Size', 1, 0, 5),
        bias: new RangeType('bias', 'Bias', 5e-4, 1e-4, 2e-1),
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

    dof: {
        focalDist: new RangeType('focalDist', 'Focal Dist', 5, 0.1, 20),
        focalRange: new RangeType('focalRange', 'Focal Range', 1, 0, 5),
        fstop: new RangeType('fstop', 'f/stop', 1.4, 1, 10)
    },

    inspectorType: 'material',

    inspectorMaterial: {
        name: new StringType('name', 'Material ID'),

        color:  new ColorType('color', 'Base Color', '#ffffff'),
        emission: new ColorType('emission', 'Emission', '#000000'),

        metalness: new RangeType('metalness', 'Metalness', 0, 0, 1),
        roughness: new RangeType('roughness', 'Roughness', 0, 0, 1),

        alpha: new RangeType('alpha', 'Alpha', 0, 0, 1),

        emissionIntensity: new RangeType('emissionIntensity', 'Emission Intensity', 0, 0, 50),

        uvRepeat: new VectorType('uvRepeat', 'UV Repeat', [1, 1]),
        uvOffset: new VectorType('uvOffset', 'UV Repeat', [0, 0]),

        diffuseMap: new TextureType('diffuseMap', 'Diffuse Map'),
        normalMap: new TextureType('normalMap', 'Normal Map'),
        roughnessMap: new TextureType('roughnessMap', 'Roughness Map'),
        metalnessMap: new TextureType('metalnessMap', 'Metalness Map'),
        emissiveMap: new TextureType('emissiveMap', 'Emissive Map')
    },

    inspectorLight: [
        new StringType('meshId', 'Mesh ID'),

        new VectorType('position', 'Position', [0, 0, 0]),
        new VectorType('rotation', 'Rotation', [0, 0, 0]),

        new ColorType('color', 'Color', '#fff'),

        new RangeType('intensity', 'Intensity', 1, 0, 50)
    ]
};


for (var propName in store.inspectorMaterial) {
    if (store.inspectorMaterial[propName].type === 'texture') {
        store.inspectorMaterial[propName].textureRootPath = store.textureRootPath;
    }
};

export default store;