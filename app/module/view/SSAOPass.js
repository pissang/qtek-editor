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

        this._globalGBufferMat = new qtek.Material({
            shader: new qtek.Shader({
                vertex: qtek.Shader.source('normal.vertex'),
                fragment: qtek.Shader.source('normal.fragment')
            })
        });
        this._ssaoPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.fragment')
        });
        this._blurPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('ssao.blur.fragment')
        });
        this._ssaoFramebuffer = new qtek.FrameBuffer();
        this._gBufferFramebuffer = new qtek.FrameBuffer();
        this._ssaoTex = new qtek.Texture2D();
        this._normalTex = new qtek.Texture2D({
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST
        });
        this._depthTex = new qtek.Texture2D({
            minFilter: qtek.Texture.NEAREST,
            magFilter: qtek.Texture.NEAREST,
            format: qtek.Texture.DEPTH_COMPONENT,
            type: qtek.Texture.UNSIGNED_INT
        });

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

    resize (width, height) {
        this._ssaoTex.width = width;
        this._ssaoTex.height = height;
        this._ssaoTex.dirty();

        this._normalTex.width = width;
        this._normalTex.height = height;
        this._normalTex.dirty();

        this._depthTex.width = width;
        this._depthTex.height = height;
        this._depthTex.dirty();
    }

    render (renderer, scene, camera) {

        this._renderGBuffer(renderer, scene, camera);

        var width = renderer.getWidth();
        var height = renderer.getHeight();
        var normalTex = this._normalTex;
        var depthTex = this._depthTex;
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
        if (width !== ssaoTexture.width || height !== ssaoTexture.height) {
            ssaoTexture.width = width;
            ssaoTexture.height = height;
            ssaoTexture.dirty();
        }
        this._ssaoFramebuffer.attach(renderer.gl, ssaoTexture);
        this._ssaoFramebuffer.bind(renderer);
        renderer.gl.clearColor(1, 1, 1, 1);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        ssaoPass.render(renderer);
        this._ssaoFramebuffer.unbind(renderer);

        blurPass.material.blend = function (gl) {
            gl.blendEquation(gl.FUNC_ADD);
            gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
        };
        blurPass.setUniform('textureSize', [width, height]);
        blurPass.setUniform('texture', ssaoTexture);
        blurPass.render(renderer);
    }

    _renderGBuffer (renderer, scene, camera) {
        this._gBufferFramebuffer.bind(renderer);
        this._gBufferFramebuffer.attach(renderer.gl, this._normalTex);
        this._gBufferFramebuffer.attach(renderer.gl, this._depthTex, renderer.gl.DEPTH_ATTACHMENT);
        renderer.gl.clearColor(0, 0, 0, 0);
        renderer.gl.depthMask(true);
        renderer.gl.colorMask(true, true, true, true);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT | renderer.gl.DEPTH_BUFFER_BIT);
        renderer.gl.disable(renderer.gl.BLEND);
        renderer.renderQueue(scene.opaqueQueue, camera, this._globalGBufferMat);
        renderer.renderQueue(scene.transparentQueue, camera, this._globalGBufferMat);

        this._gBufferFramebuffer.unbind(renderer);
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