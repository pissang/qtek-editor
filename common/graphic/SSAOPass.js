import qtek from 'qtek';
import PostProcessPass from './PostProcessPass';

qtek.Shader['import'](require('text!./normal.essl'));
qtek.Shader['import'](require('text!./ssao.essl'));

function generateNoiseData(size) {
    var data = new Uint8Array(size * size * 4);
    var n = 0;
    var v3 = new qtek.math.Vector3();
    for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
            v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, 0).normalize();
            data[n++] = (v3.x * 0.5 + 0.5) * 255;
            data[n++] = (v3.y * 0.5 + 0.5) * 255;
            data[n++] = 0;
            data[n++] = 255;
        }
    }
    return data;
}

function generateNoiseTexture(size) {
    return new qtek.Texture2D({
        pixels: generateNoiseData(size),
        wrapS: qtek.Texture.REPEAT,
        wrapT: qtek.Texture.REPEAT,
        width: size,
        height: size
    });
}

function generateKernel(size) {
    var kernel = new Float32Array(size * 3);
    var v3 = new qtek.math.Vector3();
    for (var i = 0; i < size; i++) {
        v3.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random())
            .normalize().scale(Math.random());
        kernel[i * 3] = v3.x;
        kernel[i * 3 + 1] = v3.y;
        kernel[i * 3 + 2] = v3.z;
    }
    return kernel;
}

export default class SSAOPass {
    constructor(opt) {

        opt = opt || {};

        this._gBuffer = opt.gBuffer;

        this._ssaoPass = new PostProcessPass(qtek.Shader.source('ssao.fragment'), true, [1, 1, 1, 1]);
        this._blurPass1 = new PostProcessPass(qtek.Shader.source('ssao.blur_h'), true);
        this._blurPass2 = new PostProcessPass(qtek.Shader.source('ssao.blur_v'), opt.renderToTexture);

        this._blurPass1.setUniform('colorTex', this._ssaoPass.getTargetTexture());
        this._blurPass1.setUniform('depthTex', this._gBuffer.getDepthTex());
        this._blurPass2.setUniform('colorTex', this._blurPass1.getTargetTexture());
        this._blurPass2.setUniform('depthTex', this._gBuffer.getDepthTex());

        this.setNoiseSize(4);
        this.setKernelSize(opt.kernelSize || 64);
        this.setParameter('blurSize', opt.blurSize || 4);
        if (opt.radius != null) {
            this.setParameter('radius', opt.radius);
        }
        if (opt.power != null) {
            this.setParameter('power', opt.power);
        }
    }

    _resize (width, height) {
        this._ssaoPass.resize(width / 2, height / 2);
        this._blurPass1.resize(width, height);
        this._blurPass2.resize(width, height);

        this._blurPass1.setUniform('textureSize', [width / 2, height / 2]);
        this._blurPass2.setUniform('textureSize', [width / 2, height / 2]);

        this._width = width;
        this._height = height;
    }

    render (renderer, camera) {
        var width = renderer.getWidth();
        var height = renderer.getHeight();

        if (width !== this._width ||
            height !== this._height
        ) {
            this._resize(width, height);
        }

        var normalTex = this._gBuffer.getNormalTex();
        var depthTex = this._gBuffer.getDepthTex();
        var ssaoPass = this._ssaoPass;

        ssaoPass.setUniform('normalTex', normalTex);
        ssaoPass.setUniform('depthTex', depthTex);
        ssaoPass.setUniform('normalTexSize', [normalTex.width, normalTex.height]);

        var viewInverseTranspose = new qtek.math.Matrix4();
        qtek.math.Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssaoPass.setUniform('projection', camera.projectionMatrix._array);
        ssaoPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssaoPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        ssaoPass.render(renderer);

        this._blurPass1.render(renderer);
        this._blurPass2.render(renderer);
    }

    clear (renderer) {
        this._blurPass2.clear(renderer);
    }

    getTargetTexture () {
        return this._blurPass2.getTargetTexture();
    }

    setParameter (name, val) {
        if (name === 'kernelSize') {
            this.setKernelSize(val);
        }
        else if (name === 'noiseSize') {
            this.setNoiseSize(val);
        }
        else if (name === 'blurSize') {
            this._blurPass1.setUniform('blurSize', val);
            this._blurPass2.setUniform('blurSize', val);
        }
        else {
            this._ssaoPass.setUniform(name, val);
        }
    }

    setKernelSize (size) {
        this._ssaoPass.getShader().define('fragment', 'KERNEL_SIZE', size);
        this._ssaoPass.setUniform('kernel', generateKernel(size));
    }

    setNoiseSize (size) {
        var texture = this._ssaoPass.getUniform('noiseTex');
        if (!texture) {
            texture = generateNoiseTexture(size);
            this._ssaoPass.setUniform('noiseTex', generateNoiseTexture(size));
        }
        else {
            texture.pixels = generateNoiseData(size);
            texture.width = texture.height = size;
            texture.dirty();
        }

        this._ssaoPass.setUniform('noiseTexSize', [size, size]);
    }
}