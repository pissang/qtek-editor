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

    textureRootPath: 'http://localhost/baidu-screen/asset/texture/zhanqu/',

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
        radius: new RangeType('radius', 'Radius', 0.5, 0, 5, 0.01),
        kernelSize: new RangeType('kernelSize', 'Kernel Size', 64, 0, 256, 1),
        blurSize: new RangeType('blurSize', 'Blur Size', 4, 0, 10, 1),
        power: new RangeType('power', 'Power', 0.2, 0, 5, 0.01)
    },

    inspectorMaterial: [
        new StringType('materialId', 'Material ID'),

        new ColorType('color', 'Base Color', '#fff'),
        new ColorType('specularColor', 'Specular Color', '#222'),
        new RangeType('glossiness', 'Glossiness', 0, 0, 1),

        new RangeType('alpha', 'Alpha', 0, 0, 1),

        new ColorType('emission', 'Emission', '#000'),

        new TextureType('diffuseMap', 'Diffuse Map'),
        new TextureType('normalMap', 'Normal Map'),
        new TextureType('specularMap', 'Specular Map')

        // new TextureType('environmentMap', 'Environment Map')
    ]
};

store.inspectorMaterial.forEach(function (mat) {
    if (mat.type === 'texture') {
        mat.textureRootPath = store.textureRootPath;
    }
});

export default store;