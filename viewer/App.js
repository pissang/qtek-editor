import ViewMain from '../common/ViewMain';
import qtek from 'qtek';

export default {

    data () {
        return {};
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot);

        var self = this;
        viewMain.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/hall.hdr', -1);
                rootNode.rotation.rotateX(-Math.PI / 2);

                $.getJSON('asset/model/kitchen/mat.json').then(function (config) {
                    rootNode.traverse(function (mesh) {
                        var material = mesh.material;
                        if (material && material.name && config.materials[material.name]) {
                            var materialConfig = config.materials[material.name];
                            setMaterial(material, materialConfig);
                        }
                    });
                    for (var name in config.ssao) {
                        viewMain.setSsaoParameter(name, config.ssao[name]);
                    }
                    for (var name in config.ssr) {
                        viewMain.setSsrParameter(name, config.ssr[name]);
                    }

                    if (config.currentCamera) {
                        viewMain.setCameraPositionAndRotation(
                            config.currentCamera.position,
                            config.currentCamera.rotation
                        );
                    }

                    viewMain.render();
                });
            });

        window.addEventListener('resize', function () { viewMain.resize(); });

        var simpleProperties = ['color', 'glossiness', 'alpha', 'metalness', 'emission', 'emissionIntensity'];
        var textureProperies = ['diffuseMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];

        function setMaterial(mat, config) {
            var enabledTextures = textureProperies.filter(function (name) {
                return config[name];
            });
            viewMain.updateShader(enabledTextures, mat);

            simpleProperties.forEach(function (prop) {
                var val = config[prop];
                if (val != null) {
                    mat.set(prop, val);
                }
            });

            var isTransparent = config.alpha < 1;
            mat.transparent = isTransparent;
            mat.depthMask = !isTransparent;

            textureProperies.forEach(function (name) {
                var textureFileName = config[name];
                if (textureFileName) {
                    var texture = mat.get(name) || new qtek.Texture2D({
                        wrapS: qtek.Texture.REPEAT,
                        wrapT: qtek.Texture.REPEAT,
                        anisotropic: 32
                    });
                    var path = 'asset/model/kitchen/' + textureFileName;
                    if (texture && texture.image && texture.image.src === path) {
                        return;
                    }
                    texture.load(path).success(function () {
                        viewMain.render();
                    });
                    // FIXME
                    mat.set(name, texture);
                }
                else {
                    mat.set(name, null);
                }
            });

            mat.set('uvRepeat', [+config.uvRepeat0 || 1, +config.uvRepeat1 || 1]);
        }
    }
}