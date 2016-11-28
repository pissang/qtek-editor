import qtek from 'qtek';
import GBuffer from './GBuffer';

qtek.Shader['import'](require('text!./sobel.essl'));

export default class EdgePass {
    constructor() {
        this._edgePass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('sobel.fragment')
        });

        this._gBuffer = new GBuffer();

        this._edgePass.setUniform('color', [
            33 / 255,
            227 / 255,
            247 / 255
        ]);
    }

    resize (width, height) {
        this._edgePass.setUniform('textureSize', [width, height]);
        this._gBuffer.resize(width, height);
    }

    render (renderer, scene, camera) {
        camera.update(true);
        scene.update(true);

        this._gBuffer.render(renderer, scene, camera);

        this._edgePass.setUniform('normalTex', this._gBuffer.getNormalTex());
        this._edgePass.setUniform('depthTex', this._gBuffer.getDepthTex());
        this._edgePass.setUniform('projection', camera.projectionMatrix._array);

        renderer.gl.clearColor(0, 0, 0, 0);
        renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        this._edgePass.render(renderer);
    }
}