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

        function inspectMaterial(mesh) {
            var material = mesh.material;
            inspectorMaterialMap.materialId.value = material.name;
            inspectorMaterialMap.color.value = stringifyColor(material.get('color'));
            inspectorMaterialMap.specularColor.value = stringifyColor(material.get('specularColor'));
            inspectorMaterialMap.emission.value = stringifyColor(material.get('emission'));

            inspectorMaterialMap.glossiness.value = material.get('glossiness');
            inspectorMaterialMap.alpha.value = material.get('alpha');

            this._currentMesh = mesh;
        }

        this.$watch('inspectorMaterial', function () {
            if (!this._currentMesh) {
                return;
            }
            var currentMaterial = this._currentMesh.material;
            currentMaterial.set('color', parseColor(inspectorMaterialMap.color.value));
            currentMaterial.set('specularColor', parseColor(inspectorMaterialMap.specularColor.value));
            currentMaterial.set('emission', parseColor(inspectorMaterialMap.emission.value));
            currentMaterial.set('glossiness', inspectorMaterialMap.glossiness.value);
            currentMaterial.set('alpha', inspectorMaterialMap.alpha.value);
            var isTransparent = inspectorMaterialMap.alpha.value < 1;
            currentMaterial.transparent = isTransparent;
            currentMaterial.depthMask = !isTransparent;

            this._viewMain.render();
        }, { deep: true });

        function stringifyColor(colorArr) {
            return '#' + colorUtil.toHex(colorUtil.stringify(
                [
                    Math.round(colorArr[0] * 255),
                    Math.round(colorArr[1] * 255),
                    Math.round(colorArr[2] * 255)
                ],
                'rgb'
            ));
        }

        function parseColor(colorStr) {
            return colorUtil.parse(colorStr).slice(0, 3).map(function (channel) {
                return channel / 255;
            });
        }

        function saveLocal() {
            var materialMap = {};
            if (modelRootNode) {
                modelRootNode.traverse(function (mesh) {
                    if (mesh.material) {
                        materialMap[mesh.material.name] = {
                            color: mesh.material.get('color'),
                            specularColor: mesh.material.get('specularColor'),
                            glossiness: mesh.material.get('glossiness'),
                            alpha: mesh.material.get('alpha'),
                            emission: mesh.material.get('emission')
                        };
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
                    for (var key in materialConfig) {
                        mesh.material.set(key, materialConfig[key]);
                    }
                    var isTransparent = materialConfig.alpha < 1;
                    material.transparent = isTransparent;
                    material.depthMask = !isTransparent;
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