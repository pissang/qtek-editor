import Vue from 'vue';

// https://github.com/vuejs/vue/issues/2637
// https://github.com/rpkilby/vue-nonreactive
function nonreactive(val) {
    const Observer = (new Vue()).$data
                                .__ob__
                                .constructor;

    // Set dummy observer on value
    val.__ob__ = new Observer({});
    return val;

}

function quantity(val) {
    return Math.pow(10, Math.floor(Math.log(val) / Math.LN10));
}

function BooleanType(name, val) {
    return {
        type: 'boolean',
        value: !!val
    };
}

function StringType(name, val) {
    return {
        name: name,
        type: 'string',
        value: val
    };
}

function TextureType(name, src, textureType) {
    return {
        name: name,
        type: 'texture',
        textureType: textureType || '2d',
        value: src || ''
    };
}

function RangeType(name, val, min, max, step) {
    min = min || 0;
    max = max == null ? 1 : max;
    return {
        name: name,
        type: 'range',
        min: min,
        max: max,
        step: step || (quantity(max - min) / 100),
        value: val || 0
    };
}

function ColorType(name, val) {
    return {
        name: name,
        type: 'color',
        value: val || ''
    };
}

function NumberType(name, val, step) {
    return {
        name: name,
        type: 'number',
        value: val || 0,
        step: step || quantity(val) / 100
    };
}

function VectorType(name, val, step) {
    return {
        name: name,
        type: 'vector',
        value: val || [],
        step: step || quantity(val[0]) / 100
    };
}

function EnumType(name, val, options) {
    return {
        name: name,
        type: 'enum',
        value:  val || options[0] || null,
        options: options || []
    }
}

var store = {

    // textureRootPath: 'http://localhost/baidu-screen/asset/texture/zhanqu2/',
    textureRootPath: window.location.origin + '/qtek-editor/asset/model/kitchen/texture/',

    useFreeCamera: false,

    currentClip: 0,

    clipNames: [],

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

    enableSSAO: true,

    enableSSR: true,

    ssao: {
        radius: new RangeType('radius', 0.5, 0, 2, 0.005),
        kernelSize: new RangeType('kernelSize', 64, 1, 256, 1),
        power: new RangeType('power', 0.2, -5, 5, 0.01),
        scale: new RangeType('scale', 0.5, 0, 5, 0.01),
        blurSize: new RangeType('blurSize', 1, 0, 5),
        bias: new RangeType('bias', 5e-4, 1e-4, 2e-1),
        epsilon: new RangeType('epsilon', 0.1, 1e-3, 0.2)
    },

    ssr: {
        maxIteration: new RangeType('maxIteration', 32, 1, 256, 1),
        maxBinaryIteration: new RangeType('maxBinaryIteration', 5, 0, 64, 1),
        maxRayDistance: new RangeType('maxRayDistance', 10, 0, 50),
        pixelStride: new RangeType('pixelStride', 16, 1, 50, 1),
        pixelStrideZCutoff: new RangeType('pixelStrideZCutoff', 50, 1, 1000, 1),
        eyeFadeStart: new RangeType('eyeFadeStart', 0.5, 0, 1),
        eyeFadeEnd: new RangeType('eyeFadeEnd', 1, 0, 1),
        minGlossiness: new RangeType('minGlossiness', 0.4, 0, 1),
        zThicknessThreshold: new RangeType('zThicknessThreshold', 0.1, 0, 2)
    },

    dof: {
        focalDist: new RangeType('focalDist', 5, 0.1, 20),
        focalRange: new RangeType('focalRange', 1, 0, 5),
        fstop: new RangeType('fstop', 1.4, 1, 10)
    },

    inspectorType: '',

    inspectorMaterial: {
        name: new StringType('name'),

        color:  new ColorType('color', '#ffffff'),
        emission: new ColorType('emission', '#000000'),

        metalness: new RangeType('metalness', 0, 0, 1),
        roughness: new RangeType('roughness', 0, 0, 1),

        alpha: new RangeType('alpha', 0, 0, 1),

        emissionIntensity: new RangeType('emissionIntensity', 0, 0, 50),

        uvRepeat: new VectorType('uvRepeat', [1, 1]),
        uvOffset: new VectorType('uvOffset', [0, 0]),

        diffuseMap: new TextureType('diffuseMap'),
        normalMap: new TextureType('normalMap'),
        roughnessMap: new TextureType('roughnessMap'),
        metalnessMap: new TextureType('metalnessMap'),
        emissiveMap: new TextureType('emissiveMap')
    },

    inspectorLight: {
        name: new StringType('name', 'Name'),

        type: new EnumType('type', 'Light Type', 'point', [{
            value: 'ambient',
            title: 'Ambient'
        }, {
            value: 'directional',
            title: 'Directional'
        }, {
            value: 'spot',
            title: 'Spot'
        }, {
            value: 'point',
            title: 'Point'
        }]),

        position: new VectorType('position', [0, 0, 0]),
        rotation: new VectorType('rotation', [0, 0, 0]),

        fixedTarget: new BooleanType('fixedTarget', false),
        target: new VectorType('target', [0, 0, 0]),


        color: new ColorType('color', '#ffffff'),

        intensity: new RangeType('intensity', 1, 0, 50)
    },

    inspectorLightExtra: {
        point: {
            range: new NumberType('range', 10)
        },
        spot: {
            range: new NumberType('range', 10),
            umbraAngle: new RangeType('umbraAngle', 30, 0, 90),
            penumbraAngle: new RangeType('penumbraAngle', 30, 0, 90)
        }
    }
};

nonreactive(store.clips);

for (var propName in store.inspectorMaterial) {
    if (store.inspectorMaterial[propName].type === 'texture') {
        store.inspectorMaterial[propName].textureRootPath = store.textureRootPath;
    }
}

export default store;