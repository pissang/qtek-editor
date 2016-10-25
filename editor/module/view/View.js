import ViewMain from '../../../common/ViewMain';
import Scene from '../../../common/Scene';
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
        var scene = this._scene = new Scene(viewMain, {
            textureRootPath: store.textureRootPath
        });
        var self = this;

        // scene.loadModel('asset/model/bmps/bmps.gltf')
        // scene.loadModel('asset/model/tronCycle/tronCycle.gltf')
        scene.loadModel('asset/model/kitchen/kitchen-mod.gltf')
        // scene.loadModel('asset/model/kitchen/sofa.gltf')
        // scene.loadModel('asset/model/watch/watch.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);

                viewMain.focusOn(rootNode);

                setInterval(saveLocal, 5000);

                loadLocal();

                viewMain.loadPanorama('asset/texture/hall.hdr', -0.6, function () {
                    viewMain.updateEnvProbe();
                });

                viewMain.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
                    .then(function (clips) {
                        var clipsArr = [];
                        for (var name in clips) {
                            clipsArr.push(clips[name]);

                            store.clips.push(name);
                        }
                        self._clips = clipsArr;
                    });
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
            scene.setMaterial(currentMaterial, config);
        }, { deep: true });


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

        function saveLocal() {
            var materialMap = scene.exportMaterials();
            var ssao = {};
            for (var name in store.ssao) {
                ssao[name] = store.ssao[name].value;
            }
            var ssr = {};
            for (var name in store.ssr) {
                ssr[name] = store.ssr[name].value;
            }
            var dof = {};
            for (var name in store.dof) {
                dof[name] = store.dof[name].value;
            }

            window.localStorage.setItem('qtek-editor-draft', JSON.stringify({
                ssao: ssao,
                ssr: ssr,
                dof: dof,
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
            for (var name in config.dof) {
                if (store.dof[name]) {
                    store.dof[name].value = config.dof[name];
                }
            }

            scene.loadConfig(config);
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
        function updateDofParameter() {
            for (var name in store.dof) {
                viewMain.setDofParameter(name, store.dof[name].value);
            }
            viewMain.render();
        }

        this.$watch('ssao', updateSsaoParameter, { deep: true });
        this.$watch('ssr', updateSsrParameter, { deep: true });
        this.$watch('dof', updateDofParameter, { deep: true });

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
            this._viewMain.playCameraAnimation(this._clips[store.currentClip]);
        }
    }
};