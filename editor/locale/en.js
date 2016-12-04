module.exports = {

    scene: {
        title: 'Scene'
    },

    render: {
        title: 'Render',

        ssao: {
            title: 'Screen Space Ambient Occulusion',

            radius: 'Radius',
            kernelSize: 'Kernel Size',
            power: 'Power',
            scale: 'Scale',
            blurSize: 'Blur Size',
            bias: 'Bias',
            epsilon: 'Epsilon'
        },

        ssr: {
            title: 'Screen Space Reflection',

            maxIteration: 'Max Iteration',
            maxBinaryIteration: 'Max Binary Iteration',
            maxRayDistance: 'Max Ray Distance',
            pixelStride: 'Pixel Stride',
            pixelStrideZCutoff: 'Pixel Stride Z Cutoff',
            eyeFadeStart: 'Eye Fade Start',
            eyeFadeEnd: 'Eye Fade End',
            minGlossiness: 'Min Glossiness',
            zThicknessThreshold: 'Z Thickness Threshold'
        },

        dof: {
            title: 'Depth of Field',

            focalDist: 'Focal Distance',
            focalRange: 'Focal Range',
            fstop: 'F/Stop'
        }
    },

    entity: {
        title: 'Entity'
    },

    material: {
        title: 'Material'
    },

    light: {
        types: {
            point: 'Point Light',
            ambient: 'Ambient Light',
            spot: 'Spot Light',
            directional: 'Directional Light'
        }
    },

    radius: {
        title: 'Radius'
    }
};