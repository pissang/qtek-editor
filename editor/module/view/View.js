import ViewMain from '../../../common/ViewMain';
import Scene from '../../../common/Scene';
import eventBus from '../../../common/eventBus';
import store from '../../store';

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
        let sceneLevel = this._sceneLevel = new Scene(viewMain, {
            textureRootPath: store.textureRootPath
        });
        let self = this;

        sceneLevel.loadModel('asset/model/kitchen/kitchen-mod.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);

                viewMain.focusOn(rootNode);

                setInterval(saveLocal, 5000);

                loadLocal();

                viewMain.loadPanorama('asset/texture/Mans_Outside_2k.hdr', 0.5);

                viewMain.updateEnvProbe();

                sceneLevel.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
                    .then(function (clips) {
                        let clipsArr = [];
                        for (let key in clips) {
                            clipsArr.push(clips[key]);

                            store.clips.push(key);
                        }
                        self._clips = clipsArr;
                    });

                store.sceneTree.root = sceneLevel.getSceneTree();
            });

        window.addEventListener('resize', function () { viewMain.resize(); });

        eventBus.$on('select', inspectMaterial);
        eventBus.$on('render', function (renderStat) {
            let camera = viewMain.getCamera();
            store.currentCamera.position = Array.prototype.slice.call(camera.position._array);
            store.currentCamera.rotation = Array.prototype.slice.call(camera.rotation._array);
            store.renderStat.renderTime = Math.round(renderStat.renderTime);
            store.renderStat.vertexCount = renderStat.vertexCount;
            store.renderStat.drawCallCount = renderStat.drawCallCount;
        });

        function inspectMaterial(mesh) {
            let config = sceneLevel.getMaterialConfig(mesh.material);

            for (let key in config) {
                if (store.inspectorMaterial[key]) {
                    store.inspectorMaterial[key].value = config[key];
                }
            }

            self._currentMesh = mesh;
        }

        this.$watch('inspectorMaterial', function () {
            if (!this._currentMesh) {
                return;
            }
            let currentMaterial = this._currentMesh.material;
            let config = {};
            for (let key in store.inspectorMaterial) {
                config[key] = store.inspectorMaterial[key].value;
            }
            sceneLevel.setMaterial(currentMaterial, config);
        }, { deep: true });


        function saveLocal() {
            let materialMap = sceneLevel.exportMaterials();

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

            sceneLevel.loadConfig(config);
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

        this.$watch('enableSsao + enableSsr', function () {
            viewMain.enableSsao = this.enableSsao;
            viewMain.enableSsr = this.enableSsr;
            viewMain.render();
        });

        // https://github.com/jeresig/jquery.hotkeys
        $(document).bind('keydown', 'f', function () {
            viewMain.focusOn(self._currentMesh);
        });
    },

    methods: {
        focusCurrent: function () {
            this._viewMain.focusOn(
                this._currentMesh || this._rootNode
            );
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
            this._viewMain.playCameraAnimation(this._clips[store.currentClip]);
        }
    }
};