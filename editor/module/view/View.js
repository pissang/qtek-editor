import ViewMain from '../../../common/ViewMain';
import SceneBridge from '../../../common/SceneBridge';
import eventBus from '../../../common/eventBus';
import store from '../../store';
import BoundingGizmo from '../../helper/BoundingGizmo';

import qtek from 'qtek';

let POSTPROCESSINGS = ['ssao', 'ssr', 'dof'];

export default {

    data () {
        return store;
    },

    ready () {

        let viewRoot = this.$el.querySelector('.view-main');
        let viewMain = this._viewMain = new ViewMain(viewRoot, {
            enablePicking: true
        });
        let sceneBridge = this._sceneBridge = new SceneBridge(viewMain, {
            textureRootPath: store.textureRootPath
        });


        let boundingGizmo = new BoundingGizmo();

        require('../../resource/template/kitchen').load(sceneBridge, store, function () {
            setInterval(saveLocal, 5000);
            loadLocal();
        });

        eventBus.$on('select', function (mesh) {
            store.sceneTree.selected = mesh.name;

            boundingGizmo.target = mesh;
        });

        viewMain.renderOthersShareDepthBuffer = function (renderer, scene, camera) {        };
        viewMain.renderOthersAfterCompositing = function (renderer, scene, camera) {
            if (boundingGizmo.target) {
                boundingGizmo.update();
                renderer.renderQueue([boundingGizmo], camera);
            }
        };

        function inspectMaterial(mesh) {
            let config = sceneBridge.getMaterialConfig(mesh.material);

            for (let key in config) {
                if (store.inspectorMaterial[key]) {
                    store.inspectorMaterial[key].value = config[key];
                }
            }
        }

        function inspectLight(light) {
            let config = sceneBridge.getLightBasicConfig(light);
            let lightType = light.type.toLowerCase();
            for (let key in config) {
                if (store.inspectorLight[key]) {
                    store.inspectorLight[key].value = config[key];
                }
            }
            if (store.inspectorLightExtra[lightType]) {
                var extraConfig = sceneBridge.getLightExtraConfig(light);
                for (let key in extraConfig) {
                    if (store.inspectorLightExtra[lightType]) {
                        store.inspectorLightExtra[lightType] = config[key];
                    }
                }
            }
        }

        this.$watch('inspectorMaterial', function () {
            let mesh = sceneBridge.getNodeByName(store.sceneTree.selected);

            let currentMaterial = mesh && mesh.material;
            if (currentMaterial) {
                let config = {};
                for (let key in store.inspectorMaterial) {
                    config[key] = store.inspectorMaterial[key].value;
                }
                sceneBridge.setMaterial(currentMaterial, config);
            }

            viewMain.render();
        }, { deep: true });

        this.$watch('inspectorLight', function () {
            let light = sceneBridge.getNodeByName(store.sceneTree.selected);

            if (light instanceof qtek.Light) {
                let config = {};
                for (let key in store.inspectorLight) {
                    config[key] = store.inspectorLight[key].value;
                }
                sceneBridge.setLightBasicConfig(light, config);

                let inspectorLightExtra = store.inspectorLightExtra[light.type.toLowerCase()];
                if (inspectorLightExtra) {
                    let extraConfig = {};
                    for (let key in inspectorLightExtra) {
                        extraConfig[key] = inspectorLightExtra[key].value;
                    }
                    sceneBridge.setLightExtraConfig(light, extraConfig);
                }
            }

            viewMain.render();
        }, { deep: true });

        this.$watch('sceneTree.selected', function (value) {
            let node = sceneBridge.getNodeByName(value);
            if (!node) {
                store.inspectorType = '';
            }
            else if (node.material) {
                store.inspectorType = 'material';
                inspectMaterial(node);
            }
            else if (node instanceof qtek.Light) {
                store.inspectorType = 'light';
                inspectLight(node);
            }
            else {
                store.inspectorType = '';
            }
        });

        function saveLocal() {
            let materialMap = sceneBridge.exportMaterials();

            let postProcessingConfigs = POSTPROCESSINGS.reduce(function (obj, ppName) {
                obj[ppName] = {};
                for (let key in store[ppName]) {
                    obj[ppName][key] = store[ppName][key].value;
                }
                return obj;
            }, {});

            window.localStorage.setItem('qtek-editor-draft', JSON.stringify(Object.assign({
                materials: materialMap,
                currentCamera: {
                    position: store.currentCamera.position,
                    rotation: store.currentCamera.rotation
                }
            }, postProcessingConfigs)));
        }

        function loadLocal() {
            let str = window.localStorage.getItem('qtek-editor-draft');
            if (str) {
                load(JSON.parse(str));
            }
        }

        function load(config) {
            POSTPROCESSINGS.forEach(function (ppName) {
                for (let key in config[ppName]) {
                    store[ppName][key].value = config[ppName][key];
                }
            });

            sceneBridge.loadConfig(config);
        }

        function setPostProcessParameter(ppName) {
            for (let key in store[ppName]) {
                viewMain.setPostProcessParameter(ppName, key, store[ppName][key].value);
            }
            viewMain.render();
        }

        POSTPROCESSINGS.forEach(function (ppName) {
            this.$watch(ppName, setPostProcessParameter.bind(null, ppName), { deep: true });
        }, this);

        this._load = load;

        this._saveLocal = saveLocal;


        this.$watch('useFreeCamera', function () {
            viewMain.switchFreeCamera(this.useFreeCamera);
        });

        this.$watch('enableSSAO + enableSSR', function () {
            viewMain.enableSSAO = this.enableSSAO;
            viewMain.enableSSR = this.enableSSR;
            viewMain.render();
        });

        // https://github.com/jeresig/jquery.hotkeys
        $(document).bind('keydown', 'f', function () {
            eventBus.$emit('mesh:focus:selected');
        });

        eventBus.$on('mesh:focus:selected', function () {
            let mesh = sceneBridge.getNodeByName(store.sceneTree.selected);
            if (mesh && mesh.material) {
                viewMain.focusOn(mesh);
            }
        });

        eventBus.$on('render', function (renderStat) {
            let camera = viewMain.getCamera();
            store.currentCamera.position = Array.prototype.slice.call(camera.position._array);
            store.currentCamera.rotation = Array.prototype.slice.call(camera.rotation._array);
            store.renderStat.renderTime = Math.round(renderStat.renderTime);
            store.renderStat.vertexCount = renderStat.vertexCount;
            store.renderStat.drawCallCount = renderStat.drawCallCount;
        });

        eventBus.$on('resize', function () {
            viewMain.resize();
        });
    },

    methods: {
        focusCurrent: function () {
            eventBus.$emit('mesh:focus:selected');
        },

        load: function () {
            let $input = $('<input type="file" />');
            let self = this;
            $input[0].addEventListener('change', function (e) {
                let file = e.target.files[0];
                let fileReader = new FileReader();
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
            this._viewMain.playCameraAnimation(store.clips[store.currentClip]);
        }
    }
};