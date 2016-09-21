import qtek from 'qtek';

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

        this._ssaoPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.fragment')
        });
        this._blurPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.blur')
        });
        this._ssaoFramebuffer = new qtek.FrameBuffer();
        this._ssaoTex = new qtek.Texture2D();

        this._blurFramebuffer = new qtek.FrameBuffer();
        this._blurTex = new qtek.Texture2D();

        this.setNoiseSize(4);
        this.setKernelSize(opt.kernelSize || 64);
        this.setParameter('blurSize', opt.blurSize || 4);
        if (opt.radius != null) {
            this.setParameter('radius', opt.radius);
        }
        if (opt.power != null) {
            this.setParameter('power', opt.power);
        }

        this._gBuffer = opt.gBuffer;
    }

    _resize (width, height) {
        this._ssaoTex.width = width;
        this._ssaoTex.height = height;
        this._blurTex.width = width;
        this._blurTex.height = height;
        this._ssaoTex.dirty();
        this._blurTex.dirty();

        this._width = width;
        this._height = height;
    }

    render (renderer, camera) {
        if (renderer.getWidth() !== this._width ||
            renderer.getHeight() !== this._height
        ) {
            this._resize(renderer.getWidth(), renderer.getHeight());
        }

        var width = renderer.getWidth();
        var height = renderer.getHeight();
        var normalTex = this._gBuffer.getNormalTex();
        var depthTex = this._gBuffer.getDepthTex();
        var ssaoPass = this._ssaoPass;
        var blurPass = this._blurPass;

        ssaoPass.setUniform('gBufferTex', normalTex);
        ssaoPass.setUniform('depthTex', depthTex);
        ssaoPass.setUniform('gBufferTexSize', [normalTex.width, normalTex.height]);
        ssaoPass.setUniform('viewportSize', [width, height]);

        var viewInverseTranspose = new qtek.math.Matrix4();
        qtek.math.Matrix4.transpose(viewInverseTranspose, camera.worldTransform);

        ssaoPass.setUniform('projection', camera.projectionMatrix._array);
        ssaoPass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        ssaoPass.setUniform('viewInverseTranspose', viewInverseTranspose._array);

        var ssaoTexture = this._ssaoTex;

        this._ssaoFramebuffer.attach(renderer.gl, ssaoTexture);
        this._ssaoFramebuffer.bind(renderer);
        renderer.gl.clearColor(1, 1, 1, 1);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        ssaoPass.render(renderer);
        this._ssaoFramebuffer.unbind(renderer);

        // blurPass.material.blend = function (gl) {
        //     gl.blendEquation(gl.FUNC_ADD);
        //     gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
        // };
        // blurPass.blendWithPrevious = true;
        this._blurFramebuffer.attach(renderer.gl, this._blurTex);
        this._blurFramebuffer.bind(renderer);
        renderer.gl.clearColor(1, 1, 1, 1);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        blurPass.setUniform('textureSize', [width, height]);
        blurPass.setUniform('texture', ssaoTexture);
        blurPass.render(renderer);
        this._blurFramebuffer.unbind(renderer);
    }

    clear (renderer) {
        this._blurFramebuffer.attach(renderer.gl, this._blurTex);
        this._blurFramebuffer.bind(renderer);
        renderer.gl.clearColor(1, 1, 1, 1);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        this._blurFramebuffer.unbind(renderer);
    }

    getTargetTexture () {
        return this._blurTex;
    }

    setParameter (name, val) {
        if (name === 'noiseTexSize') {
            this.setNoiseSize(val);
        }
        else if (name === 'kernelSize') {
            this.setKernelSize(val);
        }
        else if (name === 'blurSize') {
            this._blurPass.material.shader.define('fragment', 'BLUR_SIZE', val);
        }
        else {
            this._ssaoPass.setUniform(name, val);
        }
    }

    setKernelSize (size) {
        this._ssaoPass.material.shader.define('fragment', 'KERNEL_SIZE', size);
        this._ssaoPass.setUniform('kernel', generateKernel(size));
    }

    setNoiseSize (size) {
        var texture = this._ssaoPass.getUniform('noiseTex');
        if (!texture) {
            texture = generateNoiseTexture(size);
            this._ssaoPass.setUniform('noiseTex', generateNoiseTexture(size));
        }
        else {
            texture.data = generateNoiseData(size);
            texture.width = texture.height = size;
            texture.dirty();
        }

        this._ssaoPass.setUniform('noiseTexSize', [size, size]);
    }
}