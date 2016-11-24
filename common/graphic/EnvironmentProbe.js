// TODO Must be on the top level
import qtek from 'qtek';

var EnvironmentProbe = qtek.Node.extend({

    resolution: 128,

    prefilter: true,

    box: null,

    range: 50,

    _brdfLookup: null,

    _environmentMap: null,

    _shCoefficient: null
}, {
    updateEnvironment: function (renderer, scene, shadowMapPass) {

        if (this.box) {
            this.position.add(this.box.min).add(this.box.max).scale(0.5);
        }

        this._environmentMap = new qtek.TextureCube({
            width: this.resolution,
            height: this.resolution,
            type: qtek.Texture.FLOAT
        });
        var envMapPass = new qtek.prePass.EnvironmentMap({
            texture: this._environmentMap,
            shadowMapPass: shadowMapPass,
            far: this.range
        });
        envMapPass.position.copy(this.position);

        envMapPass.render(renderer, scene);

        if (this.prefilter) {
            var result = qtek.util.cubemap.prefilterEnvironmentMap(
                renderer, this._environmentMap
            );
            // Dispose previous
            this._environmentMap.dispose(renderer.gl);

            this._environmentMap = result.environmentMap;

            this._shCoefficient = qtek.util.sh.projectEnvironmentMap(
                renderer, result.environmentMap
            );

            this._brdfLookup = result.brdfLookup;
        }

    },

    getEnvironmentMap: function () {
        return this._environmentMap;
    },

    getSHCoefficient: function () {
        return this._shCoefficient;
    },

    getBRDFLookup: function () {
        return this._brdfLookup;
    }
});


export default EnvironmentProbe;