import ViewMain from '../../../common/ViewMain';
import store from '../../store';
import qtek from 'qtek';
import colorUtil from 'zrender/lib/tool/color';

export default {

    data () {
        return store;
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot, {
            enablePicking: true
        });
        var self = this;

        var modelRootNode;
        // TODO
        // viewMain.loadModel('http://' + window.location.host + '/baidu-screen/asset/baiduworld/zhanqu-simple2.gltf')
        //     .then(function (rootNode) {
        //         viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/hall.hdr', -2);
        //         rootNode.rotation.rotateX(-Math.PI / 2);

        //         viewMain.focusOn(rootNode);

        //         self._rootNode = modelRootNode = rootNode;

        //         setInterval(saveLocal, 5000);

        //         loadLocal();

        //         viewMain.loadCameraAnimation('http://' + window.location.host + '/baidu-screen/asset/baiduworld/animation.json')
        //             .then(function (clips) {
        //                 self._clip = clips[Object.keys(clips)[0]];
        //             });

        //     });

        // viewMain.loadModel('asset/model/bmps/bmps.gltf')
        // viewMain.loadModel('asset/model/tronCycle/tronCycle.gltf')
        viewMain.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/hall.hdr', -1);
                rootNode.rotation.rotateX(-Math.PI / 2);

                setInterval(saveLocal, 5000);

                self._rootNode = modelRootNode = rootNode;

                viewMain.focusOn(rootNode);

                loadLocal();

                // viewMain.shotEnvMap();
            });

        window.addEventListener('resize', function () { viewMain.resize(); });

        viewMain.on('select', inspectMaterial, this);
        viewMain.on('render', function (renderStat) {
            var camera = viewMain.getCamera();
            store.currentCamera.position = Array.prototype.slice.call(camera.position._array);
            store.currentCamera.rotation = Array.prototype.slice.call(camera.rotation._array);
            store.renderStat.renderTime = Math.round(renderStat.renderTime);
            store.renderStat.vertexCount = renderStat.vertexCount;
            store.renderStat.drawCallCount = renderStat.drawCallCount;
        });

        var inspectorMaterialMap = store.inspectorMaterial.reduce(function (obj, item, key) {
            obj[item.name] = item;
            return obj;
        }, {});

        var simpleProperties = ['color', 'glossiness', 'alpha', 'metalness', 'emission', 'emissionIntensity'];
        var textureProperies = ['diffuseMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];

        function inspectMaterial(mesh) {
            var material = mesh.material;
            inspectorMaterialMap.materialId.value = material.name;

            simpleProperties.forEach(function (prop) {
                var val = material.get(prop);
                if (inspectorMaterialMap[prop].type === 'color') {
                    val = stringifyColor(val);
                }
                inspectorMaterialMap[prop].value = val;
            });

            textureProperies.forEach(function (name) {
                var texture = material.get(name);
                if (texture && texture.image && texture.image.src) {
                    inspectorMaterialMap[name].value =
                        texture.image.src.split('/').pop();
                }
                else {
                    inspectorMaterialMap[name].value = '';
                }
            });

            var uvRepeat = material.get('uvRepeat');
            if (uvRepeat) {
                inspectorMaterialMap.uvRepeat0.value = uvRepeat[0];
                inspectorMaterialMap.uvRepeat1.value = uvRepeat[1];
            }

            this._currentMesh = mesh;
        }

        this.$watch('inspectorMaterial', function () {
            if (!this._currentMesh) {
                return;
            }
            var currentMaterial = this._currentMesh.material;
            var config = {};
            for (var name in inspectorMaterialMap) {
                config[name] = inspectorMaterialMap[name].value;
            }
            setMaterial(currentMaterial, config);
            viewMain.render();
        }, { deep: true });

        function setMaterial(mat, config) {
            var enabledTextures = textureProperies.filter(function (name) {
                return config[name];
            });
            viewMain.updateShader(enabledTextures, mat);

            simpleProperties.forEach(function (prop) {
                var val = config[prop];
                if (inspectorMaterialMap[prop].type === 'color') {
                    val = parseColor(val);
                }
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
                    var path = store.textureRootPath + '/' + textureFileName;
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

        function stringifyColor(colorArr) {
            if (typeof colorArr === 'string') {
                return colorArr;
            }
            return '#' + colorUtil.toHex(colorUtil.stringify(
                [
                    Math.round(colorArr[0] * 255),
                    Math.round(colorArr[1] * 255),
                    Math.round(colorArr[2] * 255)
                ],
                'rgb'
            ));
        }

        function parseColor(color) {
            if (typeof color === 'string') {
                var result = colorUtil.parse(color);
                if (result) {
                    return result.slice(0, 3).map(function (channel) {
                        return channel / 255;
                    });
                }
                return [0, 0, 0];
            }
            return color || [0, 0, 0];
        }

        function saveLocal() {
            var materialMap = {};
            if (modelRootNode) {
                modelRootNode.traverse(function (mesh) {
                    var material = mesh.material;
                    if (material) {
                        materialMap[material.name] = {};
                        simpleProperties.forEach(function (propName) {
                            materialMap[material.name][propName] = material.get(propName);
                        });
                        textureProperies.forEach(function (propName) {
                            var tex = material.get(propName);
                            if (tex && tex.image && tex.image.src) {
                                materialMap[material.name][propName] = tex.image.src.split('/').pop();
                            }
                        });
                        var uvRepeat = material.get('uvRepeat');
                        if (uvRepeat) {
                            materialMap[material.name].uvRepeat0 = uvRepeat[0];
                            materialMap[material.name].uvRepeat1 = uvRepeat[1];
                        }
                    }
                });
            }
            var ssao = {};
            for (var name in store.ssao) {
                ssao[name] = store.ssao[name].value;
            }
            var ssr = {};
            for (var name in store.ssr) {
                ssr[name] = store.ssr[name].value;
            }

            window.localStorage.setItem('qtek-editor-draft', JSON.stringify({
                ssao: ssao,
                ssr: ssr,
                materials: materialMap,
                currentCamera: {
                    position: store.currentCamera.position,
                    rotation: store.currentCamera.rotation
                }
            }));
        }

        function loadLocal() {
            var str = window.localStorage.getItem('qtek-editor-draft');
            if (str) {
                load(JSON.parse(str));
            }
        }

        function load(config) {
            modelRootNode.traverse(function (mesh) {
                var material = mesh.material;
                if (material && material.name && config.materials[material.name]) {
                    var materialConfig = config.materials[material.name];
                    setMaterial(material, materialConfig);
                }
            });
            for (var name in config.ssao) {
                if (store.ssao[name]) {
                    store.ssao[name].value = config.ssao[name];
                }
            }
            for (var name in config.ssr) {
                if (store.ssr[name]) {
                    store.ssr[name].value = config.ssr[name];
                }
            }

            if (config.currentCamera) {
                viewMain.setCameraPositionAndRotation(
                    config.currentCamera.position,
                    config.currentCamera.rotation
                );
            }

            viewMain.render();
        }

        function updateSsaoParameter() {
            for (var name in store.ssao) {
                viewMain.setSsaoParameter(name, store.ssao[name].value);
            }
            viewMain.render();
        }
        function updateSsrParameter() {
            for (var name in store.ssr) {
                viewMain.setSsrParameter(name, store.ssr[name].value);
            }
            viewMain.render();
        }

        this.$watch('ssao', updateSsaoParameter, { deep: true });
        this.$watch('ssr', updateSsrParameter, { deep: true });

        updateSsaoParameter();

        this._load = load;

        this._saveLocal = saveLocal;


        this.$watch('useFreeCamera', function () {
            viewMain.switchFreeCamera(this.useFreeCamera);
        });

        this.$watch('enableSsao + enableSsr', function () {
            viewMain.enableSsao = this.enableSsao;
            viewMain.enableSsr = this.enableSsr;
            viewMain.render();
        });

        // https://github.com/jeresig/jquery.hotkeys
        $(document).bind('keydown', 'ctrl+s', function () {
            saveLocal();
        });
    },

    methods: {
        focusCurrent: function () {
            this._viewMain.focusOn(
                this._currentMesh || this._rootNode
            );
        },

        load: function () {
            var $input = $('<input type="file" />');
            var self = this;
            $input[0].addEventListener('change', function (e) {
                var file = e.target.files[0];
                var fileReader = new FileReader();
                fileReader.onload = function (e) {
                    self._load(JSON.parse(e.target.result));
                };
                fileReader.readAsText(file);
            });
            $input.click();
        },

        saveLocal: function () {
            this._saveLocal();
        },

        download: function () {
            this._saveLocal();
        },

        playAnimation: function () {
            this._viewMain.playCameraAnimation(this._clip);
        }
    }
};