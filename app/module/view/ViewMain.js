import qtek from 'qtek';
import SSAOPass from './SSAOPass';

qtek.Shader['import'](require('text!./standardExt.essl'));

qtek.shader.library.template(
    'buildin.standardExt',
    qtek.Shader.source('buildin.standardExt.vertex'),
    qtek.Shader.source('buildin.standardExt.fragment')
);


class ViewMain {
    constructor(dom) {
        var renderer = new qtek.Renderer({
            canvas: document.createElement('canvas'),
            devicePixelRatio: 1
        });

        var camera = new qtek.camera.Perspective();
        var scene = new qtek.Scene();

        this._dom = dom;
        this._renderer = renderer;
        this._camera = camera;
        this._scene = scene;

        dom.appendChild(renderer.canvas);

        var animation = new qtek.animation.Animation();
        animation.start();
        animation.on('frame', function () {
            if (this._needsUpdate) {
                this.renderImmediately();
            }
        }, this);

        this._animation = animation;

        var control = new qtek.plugin.OrbitControl({
            target: camera,
            domElement: dom,
            animation: animation
        });
        control.on('change', function () {
            control.update(16);
            this.render();
        }, this);

        var sunLight = new qtek.light.Directional({
            intensity: 0.8
        });
        sunLight.position.set(10, 10, 10);
        sunLight.lookAt(scene.position);
        scene.add(sunLight);

        var fillLight = new qtek.light.Directional({
            intensity: 0.5
        });
        fillLight.position.set(-10, 10, -10);
        fillLight.lookAt(scene.position);
        scene.add(fillLight);

        var ambientLight = new qtek.light.Ambient({
            intensity: 0.3
        });
        scene.add(ambientLight);

        this._control = control;

        this._initHandler();

        this._ssaoPass = new SSAOPass({
            radius: 0.5,
            kernelSize: 128
        });

        this.resize();
    }

    getCamera () {
        return this._camera;
    }

    _initHandler () {
        var picking = new qtek.picking.RayPicking({
            scene: this._scene,
            camera: this._camera,
            renderer: this._renderer
        });

        this._picking = picking;
        var self = this;

        var lastSelected = null;

        function select(mesh) {
            mesh.material.set('selectMix', 0.2);
            self.render();
        }
        function unSelect(mesh) {
            mesh.material.set('selectMix', 0);
            self.render();
        }

        this._dom.addEventListener('click', function (e) {
            var x = e.offsetX;
            var y = e.offsetY;
            var result = picking.pick(x, y);
            if (result) {
                if (lastSelected) {
                    unSelect(lastSelected);
                }
                select(result.target);
                lastSelected = result.target;

                self.trigger('select', result.target);
            }
        });
    }

    setCameraPositionAndRotation (positionArr, rotationArr) {
        var camera = this._camera;
        camera.position.setArray(positionArr);
        camera.rotation.setArray(rotationArr);
        camera.update();

        this._control.origin.copy(camera.position)
            .scaleAndAdd(camera.worldTransform.z, -10);
    }

    render () {
        this._needsUpdate = true;
    }

    renderImmediately () {
        this._needsUpdate = false;
        var time = Date.now();
        var renderStat = this._renderer.render(this._scene, this._camera);
        this._ssaoPass.render(this._renderer, this._scene, this._camera);
        renderStat.renderTime = Date.now() - time;

        this.trigger('render', renderStat);
    }

    resize () {
        var width = this._dom.clientWidth;
        var height = this._dom.clientHeight;
        this._renderer.resize(width, height);
        this._camera.aspect = this._renderer.getViewportAspect();

        this._ssaoPass.resize(width, height);
    }

    loadModel (url) {
        var rootNode = new qtek.Node();
        var loader = new qtek.loader.GLTF({
            rootNode: rootNode,
            shaderName: 'buildin.standardExt'
        });
        var self = this;
        this._scene.add(rootNode);
        this._rootNode = rootNode;
        return new Promise(function (resolve, reject) {
            loader.load(url);
            loader.success(function () {
                resolve(rootNode);
                self.render();
            }).error(function () {
                reject();
            });
        });
    }

    focusOn (node) {
        this._scene.update();

        var bbox = new qtek.math.BoundingBox();
        var bboxTmp = new qtek.math.BoundingBox();
        var cp = new qtek.math.Vector3();
        var avgZ = new qtek.math.Vector3();
        node.traverse(function (mesh) {
            if (mesh.geometry) {
                bboxTmp.copy(mesh.geometry.boundingBox);
                bboxTmp.applyTransform(mesh.worldTransform);
                bbox.union(bboxTmp);
                avgZ.add(mesh.worldTransform.z);
            }
        });

        avgZ.normalize();
        // var sub = new qtek.math.Vector3().copy(bboxTmp.max).sub(bboxTmp.min);
        // var min = Math.min(Math.abs(sub.x), Math.abs(sub.y), Math.abs(sub.z));
        // if (Math.abs(sub.x) === min) {
        //     z = qtek.math.Vector3.POSITIVE_X;
        // }
        // else {
        //     // no y
        //     z = qtek.math.Vector3.POSITIVE_Z;
        // }

        cp.add(bbox.min).add(bbox.max).scale(0.5);

        var bboxSize = bbox.min.distance(bbox.max);

        this._camera.position.copy(new qtek.math.Vector3().add(cp).scaleAndAdd(avgZ, bboxSize * 2));
        this._camera.lookAt(cp, qtek.math.Vector3.UP);

        this.render();

        this._control.origin.copy(cp);
    }

    loadPanorama (url, exposure) {
        var self = this;
        var envMap = qtek.util.texture.loadTexture(
            url, {
                exposure: exposure || 1
            }, function (envMap) {
                envMap.flipY = false;
                self.setEnvMap(envMap);
            }
        );
        // var skydome = new qtek.plugin.Skydome({
        //     scene: this._scene
        // });
        // skydome.material.set('diffuseMap', envMap);

        this.render();
    }

    setEnvMap (envMap) {
        var result = this.prefilterEnvMap(envMap);
        this._rootNode.traverse(function (node) {
            if (node.material) {
                node.material.shader.enableTexture('environmentMap');
                node.material.shader.enableTexture('brdfLookup');
                node.material.shader.define('fragment', 'ENVIRONMENTMAP_PREFILTER');
                node.material.set('environmentMap', result.environmentMap);
                node.material.set('brdfLookup', result.brdfLookup);
            }
        });

        this.render();
    }

    updateShader (enabledTextures, material) {
        enabledTextures = enabledTextures.concat(['environmentMap']);
        var shader = qtek.shader.library.get('buildin.standardExt', {
            textures: enabledTextures,
            fragmentDefines: {
                ENVIRONMENTMAP_PREFILTER: null
            }
        });
        if (shader !== material.shader) {
            material.attachShader(shader, true);
        }
    }

    setSsaoParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssaoPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssaoPass.setParameter(name, value);
    }

    prefilterEnvMap (envMap) {
        return qtek.util.cubemap.prefilterEnvironmentMap(
            this._renderer, envMap, {
                width: 128,
                height: 128,
                type: qtek.Texture.UNSIGNED_BYTE
            }
        );
    }
}

Object.assign(ViewMain.prototype, qtek.core.mixin.notifier);

export default ViewMain;