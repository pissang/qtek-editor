import ViewMain from './ViewMain';
import store from '../../store';
import qtek from 'qtek';
import colorUtil from 'zrender/lib/tool/color';

export default {

    data () {
        return store;
    },

    computed () {
        return {
            camera: function () {
                var pos = this._viewMain.camera.position;
                return ;
            }
        }
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot);

        var modelRootNode;
        // TODO
        viewMain.loadModel('http://' + window.location.host + '/baidu-screen/asset/baiduworld/zhanqu.json')
            .then(function (rootNode) {
                viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/tents_con.hdr', 1.5);
                rootNode.rotation.rotateX(-Math.PI / 2);

                viewMain.focusOn(rootNode);

                modelRootNode = rootNode;

                loadLocal();

                setInterval(saveLocal, 5000);
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

        var simpleProperties = ['color', 'specularColor', 'glossiness', 'alpha', 'emission'];
        var textureProperies = ['diffuseMap', 'specularMap', 'normalMap'];

        function inspectMaterial(mesh) {
            var material = mesh.material;
            inspectorMaterialMap.materialId.value = material.name;
            inspectorMaterialMap.color.value = stringifyColor(material.get('color'));
            inspectorMaterialMap.specularColor.value = stringifyColor(material.get('specularColor'));
            inspectorMaterialMap.emission.value = stringifyColor(material.get('emission'));

            inspectorMaterialMap.glossiness.value = material.get('glossiness');
            inspectorMaterialMap.alpha.value = material.get('alpha');

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

            mat.set('color', parseColor(config.color));
            mat.set('specularColor', parseColor(config.specularColor));
            mat.set('emission', parseColor(config.emission));
            mat.set('glossiness', config.glossiness);
            mat.set('alpha', config.alpha);

            var isTransparent = config.alpha < 1;
            mat.transparent = isTransparent;
            mat.depthMask = !isTransparent;

            textureProperies.forEach(function (name) {
                var textureFileName = config[name];
                if (textureFileName) {
                    var texture = mat.get(name) || new qtek.Texture2D();
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
                return colorUtil.parse(color).slice(0, 3).map(function (channel) {
                    return channel / 255;
                });
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
                    }
                });
            }
            var ssao = {};
            for (var name in store.ssao) {
                ssao[name] = store.ssao[name].value;
            }

            window.localStorage.setItem('qtek-editor-draft', JSON.stringify({
                ssao: ssao,
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

        this.$watch('ssao', updateSsaoParameter, { deep: true });

        updateSsaoParameter();

        this._load = load;

        this._saveLocal = saveLocal;


        this.$watch('useFreeCamera', function () {
            viewMain.switchFreeCamera(this.useFreeCamera);
        });

        this.$watch('enableSsao', function () {
            viewMain.enableSsao = this.enableSsao;
            viewMain.render();
        });

        // https://github.com/jeresig/jquery.hotkeys
        $(document).bind('keydown', 'ctrl+s', function () {
            saveLocal();
        });
    },

    methods: {
        focusCurrent: function () {
            if (this._currentMesh) {
                this._viewMain.focusOn(this._currentMesh);
            }
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
        }
    }
};