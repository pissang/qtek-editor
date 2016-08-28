import qtek from 'qtek';

export default class GBuffer {

    constructor() {

        this._globalGBufferMat = new qtek.Material({
            shader: new qtek.Shader({
                vertex: qtek.Shader.source('normal.vertex'),
                fragment: qtek.Shader.source('normal.fragment')
            })
        });

        this._gBufferFramebuffer = new qtek.FrameBuffer();

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
    }

    resize (width, height) {
        this._normalTex.width = width;
        this._normalTex.height = height;
        this._normalTex.dirty();

        this._depthTex.width = width;
        this._depthTex.height = height;
        this._depthTex.dirty();

    }

    render (renderer, scene, camera) {

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

    getNormalTex () {
        return this._normalTex;
    }

    getDepthTex () {
        return this._depthTex;
    }
}