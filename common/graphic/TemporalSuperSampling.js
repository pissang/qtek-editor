// Temporal Super Sample for static Scene
import qtek from 'qtek';

// Generate halton sequence
// https://en.wikipedia.org/wiki/Halton_sequence
function halton(index, base) {

    var result = 0;
    var f = 1 / base;
    var i = index;
    while (i > 0) {
        result = result + f * (i % base);
        i = Math.floor(i / base);
        f = f / base;
    }
    return result;
}


import PostProcessPass from './PostProcessPass';


class TemporalSuperSampling {
    constructor () {
        var haltonSequence = [];

        for (var i = 0; i < 20; i++) {
            haltonSequence.push([
                halton(i, 2), halton(i, 3)
            ]);
        }

        this._haltonSequence = haltonSequence;

        this._frame = 0;

        // Frame texture before temporal supersampling
        this._prevFrameTex = new qtek.Texture2D();
        this._outputTex = new qtek.Texture2D();

        var blendPass = this._blendPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('qtek.compositor.blend')
        });
        blendPass.material.shader.disableTexturesAll();
        blendPass.material.shader.enableTexture(['texture1', 'texture2']);

        this._blendFb = new qtek.FrameBuffer({
            depthBuffer: false
        });

        this._outputPass = new PostProcessPass(
            qtek.Shader.source('qtek.compositor.output')
        );
    }

    jitterProjection (renderer, camera) {
        var width = renderer.getWidth();
        var height = renderer.getHeight();

        var offset = this._haltonSequence[this._frame];
        camera.projectionMatrix._array[8] += (offset[0] * 2.0 - 1.0) / width;
        camera.projectionMatrix._array[9] += (offset[1] * 2.0 - 1.0) / height;
    }

    resetFrame () {
        this._frame = 0;
    }

    resize (width, height) {
        this._prevFrameTex.width = width;
        this._prevFrameTex.height = height;

        this._outputTex.width = width;
        this._outputTex.height = height;

        this._prevFrameTex.dirty();
        this._outputTex.dirty();
    }

    isFinished () {
        return this._frame >= this._haltonSequence.length;
    }

    render (renderer, colorTex) {
        var blendPass = this._blendPass;
        if (this._frame === 0) {
            // Direct output
            blendPass.setUniform('weight1', 0);
            blendPass.setUniform('weight2', 1);
        }
        else {
            blendPass.setUniform('weight1', 0.9);
            blendPass.setUniform('weight2', 0.1);
        }
        blendPass.setUniform('texture1', this._prevFrameTex);
        blendPass.setUniform('texture2', colorTex);

        this._blendFb.attach(renderer.gl, this._outputTex);
        this._blendFb.bind(renderer);
        blendPass.render(renderer);
        this._blendFb.unbind(renderer);

        this._outputPass.setUniform('texture', this._outputTex);
        this._outputPass.render(renderer);

        // Swap texture
        var tmp = this._prevFrameTex;
        this._prevFrameTex = this._outputTex;
        this._outputTex = tmp;

        this._frame++;
    }
}

export default TemporalSuperSampling;