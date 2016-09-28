import ViewMain from '../common/ViewMain';
import qtek from 'qtek';

export default {

    data () {
        return {};
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot);


        function playAnimationSequerence(clips) {
            function randomClipIndex(lastIndex) {
                return (lastIndex + Math.round(Math.random()) + 1) % clips.length;
                // var idx;
                // do {
                //     idx = Math.round(Math.random() * (clips.length - 1));
                // } while (idx === lastIndex);
                // return idx;
            }
            function playClip(clipIndex) {
                var clip = clips[clipIndex];
                clip.onfinish = function () {
                    playClip(randomClipIndex(clipIndex));
                };
                viewMain.playCameraAnimation(clip);
            }
            playClip(1);
        }

        viewMain.loadModel('asset/model/kitchen/kitchen-mod.gltf')
            .then(function (rootNode) {
                viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/hall.hdr', -0.5);
                rootNode.rotation.rotateX(-Math.PI / 2);

                $.getJSON('asset/model/kitchen/mat-mod.json').then(function (config) {
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
                        viewMain.getCamera().position.setArray(config.currentCamera.position);
                        viewMain.getCamera().lookAt(qtek.math.Vector3.ZERO);
                    }

                    viewMain.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
                        .then(function (clips) {
                            var clipsArr = [];
                            for (var name in clips) {
                                clipsArr.push(clips[name]);
                            }

                            playAnimationSequerence(clipsArr);
                        });

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
                    var path = 'asset/model/kitchen/texture/' + textureFileName;
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
};