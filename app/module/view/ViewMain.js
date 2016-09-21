import qtek from 'qtek';
import GBuffer from './GBuffer';
import SSAOPass from './SSAOPass';
import SSRPass from './SSRPass';

import EdgePass from './EdgePass';

qtek.Shader['import'](require('text!./tron.essl'));

var hdrJson = JSON.parse(require('text!./hdr.json'));

class ViewMain {
    constructor(dom) {
        this.enableSsao = true;
        this.enableSsr = true;

        var renderer = new qtek.Renderer({
            canvas: document.createElement('canvas'),
            devicePixelRatio: 1,
            color: [1.0, 1.0, 1.0, 0.2]
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

        this._initScene();

        this._initControl();

        this._initHandler();

        this._gBuffer = new GBuffer();

        this._ssaoPass = new SSAOPass({
            radius: 0.5,
            kernelSize: 128,
            gBuffer: this._gBuffer
        });
        this._ssrPass = new SSRPass({
            gBuffer: this._gBuffer,
            renderToTexture: true,
            RGBM: true
        });

        this._colorFb = new qtek.FrameBuffer();
        this._colorTex = new qtek.Texture2D();

        this._shadowMapPass = new qtek.prePass.ShadowMap();

        var fx = new qtek.loader.FX();

        this._compositor = fx.parse(hdrJson);
        this._sourceNode = this._compositor.getNodeByName('source');

        this._debugPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('qtek.compositor.output')
        });

        this.resize();
    }

    _initScene () {
        var scene = this._scene;

        var mainLight = new qtek.light.Directional({
            intensity: 10.0,
            castShadow: true,
            shadowBias: 0.002,
            shadowResolution: 2048
        });
        mainLight.position.set(-5, 10, -20);
        mainLight.lookAt(scene.position);
        scene.add(mainLight);

        var fillLight = new qtek.light.Directional({
            intensity: 0.4,
            castShadow: false
        });
        fillLight.position.set(10, 10, 10);
        fillLight.lookAt(scene.position);
        scene.add(fillLight);

        var ambientLight = new qtek.light.Ambient({
            intensity: 0.3
        });
        scene.add(ambientLight);

    }

    _initControl () {

        var firstPersonControl = new qtek.plugin.FirstPersonControl({
            target: this._camera,
            domElement: this._dom,
            animation: this._animation,
            speed: 0.1
        });
        firstPersonControl.disable();
        firstPersonControl.on('change', function () {
            firstPersonControl.update(16);
            this.render();
        }, this);
        var orbitControl = new qtek.plugin.OrbitControl({
            target: this._camera,
            domElement: this._dom,
            animation: this._animation
        });
        orbitControl.on('change', function () {
            orbitControl.update(16);
            this.render();
        }, this);

        this._orbitControl = orbitControl;
        this._firstPersonControl = firstPersonControl;

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
            mesh.material.set('mixIntensity', 0.2);
            self.render();
        }
        function unSelect(mesh) {
            mesh.material.set('mixIntensity', 0);
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
            else if (lastSelected) {
                unSelect(lastSelected);
                lastSelected = null;
            }
        });
    }

    getCamera () {
        return this._camera;
    }

    switchFreeCamera (isFree) {
        var enabledControl = isFree ? this._firstPersonControl : this._orbitControl;
        var disabledControl = isFree ? this._orbitControl : this._firstPersonControl;
        enabledControl.enable();
        disabledControl.disable();
        if (!isFree) {
            this.setCameraPositionAndRotation(
                this._camera.position._array,
                this._camera.rotation._array
            );
        }
    }

    setCameraPositionAndRotation (positionArr, rotationArr) {
        var camera = this._camera;
        camera.position.setArray(positionArr);
        camera.rotation.setArray(rotationArr);
        camera.update();

        this._orbitControl.origin.copy(camera.position)
            .scaleAndAdd(camera.worldTransform.z, -10);
    }

    render () {
        this._needsUpdate = true;
    }

    renderImmediately () {
        this._needsUpdate = false;
        var time = Date.now();

        var renderStat = {};
        var renderer = this._renderer;

        var scene = this._scene;
        var camera = this._camera;
        scene.update(true);
        camera.update(true);
        this._gBuffer.update(renderer, scene, camera);
        if (this.enableSsao) {
            this._ssaoPass.render(renderer, camera);
        }
        else {
            this._ssaoPass.clear(renderer);
        }
        this._shadowMapPass.render(renderer, scene, camera);
        this._colorFb.attach(renderer.gl, this._colorTex);
        this._colorFb.bind(renderer);
        renderer.render(scene, camera, true, true);
        this._colorFb.unbind(renderer);

        this._gBuffer.update(renderer, scene, camera);
        if (this.enableSsr) {
            this._ssrPass.render(renderer, camera, this._colorTex, this._ssaoPass.getTargetTexture());
            this._sourceNode.texture = this._ssrPass.getTargetTexture();
        }
        else {
            this._sourceNode.texture = this._colorTex;
        }

        this._compositor.render(renderer);

        this._shadowMapPass.renderDebug(renderer);
        // this._debugPass.setUniform('texture', this._ssrPass.getTargetTexture());
        // this._debugPass.render(renderer);

        renderStat.renderTime = Date.now() - time;

        this.trigger('render', renderStat);
    }

    resize () {
        var width = this._dom.clientWidth;
        var height = this._dom.clientHeight;
        this._renderer.resize(width, height);
        this._camera.aspect = this._renderer.getViewportAspect();

        this._colorTex.width = width;
        this._colorTex.height = height;
        this._colorTex.dirty();

        this.render();
    }

    loadModel (url) {
        var rootNode = new qtek.Node();
        var loader = new qtek.loader.GLTF({
            rootNode: rootNode,
            shaderName: 'qtek.standard'
        });
        var self = this;
        this._scene.add(rootNode);
        this._rootNode = rootNode;
        return new Promise(function (resolve, reject) {
            loader.load(url);
            loader.success(function () {
                rootNode.traverse(function (mesh) {
                    var geometry = mesh.geometry;
                    if (geometry) {
                        mesh.beforeRender = function () {
                            var viewSize = mesh.material.get('viewportSize') || [];
                            viewSize[0] = self._renderer.getWidth();
                            viewSize[1] = self._renderer.getHeight();
                            mesh.material.set('viewportSize', viewSize);
                        };
                        if (geometry.attributes.texcoord0.value) {
                            geometry.generateTangents();
                        }
                        // generateUv(geometry);
                    }
                });

                resolve(rootNode);
                self.render();
            }).error(function () {
                reject();
            });
        });
    }

    loadCameraAnimation (url) {
        var loader = new qtek.loader.GLTF();
        var self = this;
        return new Promise(function (resolve, reject) {
            loader.load(url);
            loader.success(function (result) {
                self.render();
                resolve(result.clips);
            }).error(function () {
                reject();
            });
        });
    }

    playCameraAnimation (clip) {
        if (this._currentClip) {
            this._animation.removeClip(this._currentClip);
        }
        var camera = this._camera;
        var self = this;
        clip.restart();
        clip.onframe = function () {
            camera.position.setArray(this.position);
            camera.rotation.setArray(this.rotation);
            // FIXME Why rotateY ?
            camera.rotation.rotateY(-Math.PI / 2);
            camera.scale.setArray(this.scale);
            self.render();
        };
        this._animation.addClip(clip);

        this._currentClip = clip;
    }

    focusOn (node) {
        this._scene.update();

        var bbox = new qtek.math.BoundingBox();
        var bboxTmp = new qtek.math.BoundingBox();
        var cp = new qtek.math.Vector3();
        // var avgZ = new qtek.math.Vector3();
        node.traverse(function (mesh) {
            if (mesh.geometry) {
                bboxTmp.copy(mesh.geometry.boundingBox);
                bboxTmp.applyTransform(mesh.worldTransform);
                bbox.union(bboxTmp);
                // avgZ.add(mesh.worldTransform.z);
            }
        });

        var z = this._camera.worldTransform.z;


        cp.add(bbox.min).add(bbox.max).scale(0.5);

        // Get size;
        bbox.applyTransform(this._camera.viewMatrix);
        // avgZ.normalize();
        // var sub = new qtek.math.Vector3().copy(bboxTmp.max).sub(bboxTmp.min);
        // var min = Math.min(Math.abs(sub.x), Math.abs(sub.y), Math.abs(sub.z));
        // if (Math.abs(sub.x) === min) {
        //     z = qtek.math.Vector3.POSITIVE_X;
        // }
        // else {
        //     // no y
        //     z = qtek.math.Vector3.POSITIVE_Z;
        // }
        var bboxSize = bbox.min.distance(bbox.max);

        this._camera.position.copy(new qtek.math.Vector3().add(cp).scaleAndAdd(z, bboxSize * 1.5));
        this._camera.lookAt(cp, qtek.math.Vector3.UP);

        this.render();

        this._orbitControl.origin.copy(cp);
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
        var self = this;
        this._rootNode.traverse(function (node) {
            if (node.material) {
                node.material.shader.enableTexture('environmentMap');
                node.material.shader.enableTexture('brdfLookup');
                node.material.shader.enableTexture('ssaoMap');
                node.material.set('environmentMap', result.environmentMap);
                node.material.set('brdfLookup', result.brdfLookup);
                node.material.set('ssaoMap', self._ssaoPass.getTargetTexture());
            }
        });

        this.render();
    }

    updateShader (enabledTextures, material) {
        enabledTextures = enabledTextures.concat(['environmentMap', 'brdfLookup', 'ssaoMap']);
        // enabledTextures = enabledTextures.concat(['ssaoMap']);
        var shader = qtek.shader.library.get('qtek.standard', {
            textures: enabledTextures,
            fragmentDefines: {
                ENVIRONMENTMAP_PREFILTER: null,
                RGBM_ENCODE: null,
                USE_METALNESS: null,
                SRGB_DECODE: null
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

    setSsrParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssrPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssrPass.setParameter(name, value);
    }

    prefilterEnvMap (envMap) {
        return qtek.util.cubemap.prefilterEnvironmentMap(
            this._renderer, envMap, {
                width: 128,
                height: 128
                // type: qtek.Texture.UNSIGNED_BYTE
            }
        );
    }
}

Object.assign(ViewMain.prototype, qtek.core.mixin.notifier);

export default ViewMain;