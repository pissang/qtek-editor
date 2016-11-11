import qtek from 'qtek';
import GBuffer from './graphic/GBuffer';
// import SSAOPass from './graphic/SSAOPass';
import SSAOPass from './graphic/AlchemyAOPass';
import SSRPass from './graphic/SSRPass';

var hdrJson = JSON.parse(require('text!./graphic/composite.json'));


class ViewMain {
    constructor(dom, option) {
        option = option || {};

        this.enableSsao = true;
        this.enableSsr = true;

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

        this._initScene();

        this._initControl();

        option.enablePicking && this._initPickingHandler();

        this._gBuffer = new GBuffer();

        this._ssaoPass = new SSAOPass({
            gBuffer: this._gBuffer,
            renderToTexture: true
            // downScale: 2
        });
        this._ssrPass = new SSRPass({
            gBuffer: this._gBuffer,
            renderToTexture: true,
            RGBM_ENCODE: true
        });

        this._colorFb = new qtek.FrameBuffer();
        this._colorTex = new qtek.Texture2D({
            type: qtek.Texture.HALF_FLOAT
        });

        this._shadowMapPass = new qtek.prePass.ShadowMap({
            shadowCascade: 2,
            cascadeSplitLogFactor: 0
        });

        this._initCompositor();

        this.addEnvProbe([0, 1.4, 0]);

        this._debugPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('qtek.compositor.output')
        });

        this.resize();
    }

    addModel (rootNode) {
        var self = this;
        var ssaoMap = this._ssaoPass.getTargetTexture();
        rootNode.traverse(function (mesh) {
            var geometry = mesh.geometry;
            if (geometry) {
                // mesh.culling = false;
                mesh.beforeRender = function () {
                    var viewSize = mesh.material.get('viewportSize') || [];
                    viewSize[0] = self._renderer.getWidth();
                    viewSize[1] = self._renderer.getHeight();
                    mesh.material.set('viewportSize', viewSize);
                    mesh.material.shader.define('fragment', 'SSAOMAP_ENABLED');
                    mesh.material.set('ssaoMap', ssaoMap);
                };
                if (geometry.attributes.texcoord0.value) {
                    geometry.generateTangents();
                }
                mesh.material = new qtek.StandardMaterial({
                    name: mesh.material.name,
                    environmentMapPrefiltered: true
                });
            }
        });
        this._scene.add(rootNode);
        this.render();
    }

    addLight (light) {
        this._scene.add(light);
    }

    addEnvProbe (position) {
        var sphere = new qtek.Mesh({
            geometry: new qtek.geometry.Sphere(),
            material: new qtek.StandardMaterial({
                color: [1, 1, 1],
                roughness: 0,
                metalness: 1
                // environmentMapPrefiltered: true
            })
        });
        sphere.scale.set(0.2, 0.2, 0.2);

        sphere.position.setArray(position);
        sphere.update();

        this._envProbe = sphere;
    }

    _initCompositor () {

        var fx = new qtek.loader.FX();

        var self = this;
        this._compositor = fx.parse(hdrJson);

        var lutTex = new qtek.Texture2D({
            minFilter: qtek.Texture.LINEAR,
            magFilter: qtek.Texture.LINEAR,
            useMipmap: false,
            flipY: false
        });
        self._sourceNode = self._compositor.getNodeByName('source');
        lutTex.load('asset/texture/lut.png')
            .success(function () {
                self.render();
            });
        this._compositor.getNodeByName('lut').setParameter('lookup', lutTex);

        this._cocNode = self._compositor.getNodeByName('coc');
    }

    _initScene () {
        var scene = this._scene;

        var mainLight = new qtek.light.Directional({
            intensity: 20.0,
            castShadow: true,
            shadowBias: 0.005,
            shadowResolution: 2048,
            color: [1, 1, 1]
            // color: [250 / 255, 214 / 255, 165 / 255]
        });
        mainLight.position.set(-5, 7, -18);
        mainLight.lookAt(scene.position);
        scene.add(mainLight);

        var ambientLight = new qtek.light.AmbientSH({
            // Init coefficients
            coefficients: [0.8450393676757812, 0.7135089635848999, 0.6934053897857666, 0.02310405671596527, 0.17135757207870483, 0.28332242369651794, 0.343019962310791, 0.2880895435810089, 0.2998031973838806, 0.08001846075057983, 0.10719859600067139, 0.12824314832687378, 0.003927173092961311, 0.04206192493438721, 0.06470289081335068, 0.036095526069402695, 0.04928380250930786, 0.058642253279685974, -0.009344635531306267, 0.06963406503200531, 0.1312279999256134, -0.05935414880514145, -0.04865729808807373, -0.060036804527044296, 0.04625355824828148, 0.0563165508210659, 0.050963230431079865],
            intensity: 0.4
            // color: [250 / 255, 214 / 255, 165 / 255]
        });
        scene.add(ambientLight);

        this._ambientLight = ambientLight;

        var pointLight = new qtek.light.Point({
            range: 8,
            intensity: 1,
            castShadow: false,
            color: [1, 1, 1]
            // color: [250 / 255, 214 / 255, 165 / 255]
        });
        pointLight.position.y = 1;
        pointLight.position.z = 0;
        scene.add(pointLight);
    }

    _initControl () {

        var firstPersonControl = new qtek.plugin.FirstPersonControl({
            target: this._camera,
            domElement: this._dom,
            animation: this._animation,
            speed: 0.02
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

    _initPickingHandler () {
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

    getScene () {
        return this._scene;
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
            .scaleAndAdd(camera.worldTransform.z, -1);
    }

    render () {
        this._needsUpdate = true;
    }

    renderImmediately () {
        this._needsUpdate = false;
        var time = Date.now();

        var renderer = this._renderer;

        var scene = this._scene;
        var camera = this._camera;
        scene.update();
        camera.update();
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
        var renderStat = renderer.render(scene, camera, true, true);

        if (this._skydome) {
            renderer.renderQueue([this._skydome], camera);
        }
        // Render light probe
        renderer.renderQueue([this._envProbe], camera);

        this._colorFb.unbind(renderer);

        if (this.enableSsr) {
            this._ssrPass.render(renderer, camera, this._colorTex, this._ssaoPass.getTargetTexture());
            if (this._sourceNode) {
                this._sourceNode.texture = this._ssrPass.getTargetTexture();
                this._sourceNode.shaderDefine('RGBM');
                this._sourceNode.shaderUnDefine('RGBM_ENCODE');
            }
        }
        else {
            if (this._sourceNode) {
                this._sourceNode.texture = this._colorTex;
                this._sourceNode.shaderUnDefine('RGBM');
                this._sourceNode.shaderDefine('RGBM_ENCODE');
            }
        }

        this._cocNode.setParameter('depth', this._gBuffer.getDepthTex());
        this._compositor.render(renderer);

        // this._debugPass.setUniform('texture', this._colorTex);
        // this._debugPass.render(renderer);
        // this._shadowMapPass.renderDebug(renderer);


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
        node.traverse(function (mesh) {
            if (mesh.geometry) {
                bboxTmp.copy(mesh.geometry.boundingBox);
                bboxTmp.applyTransform(mesh.worldTransform);
                bbox.union(bboxTmp);
            }
        });

        var z = this._camera.worldTransform.z;

        cp.add(bbox.min).add(bbox.max).scale(0.5);

        // Get size;
        bbox.applyTransform(this._camera.viewMatrix);
        var bboxSize = bbox.min.distance(bbox.max);

        this._camera.position.copy(new qtek.math.Vector3().add(cp).scaleAndAdd(z, bboxSize * 1.5));
        this._camera.lookAt(cp, qtek.math.Vector3.UP);

        this.render();

        this._orbitControl.origin.copy(cp);
    }

    loadPanorama (url, exposure, cb) {
        var self = this;
        var envMap = qtek.util.texture.loadTexture(
            url, {
                exposure: exposure || 1
            }, function (envMap) {
                envMap.flipY = false;

                self.render();

                cb && cb();
            }
        );
        // TODO Use box
        var skydome = new qtek.Mesh({
            geometry: new qtek.geometry.Sphere(),
            material: new qtek.Material({
                shader: qtek.shader.library.get('qtek.basic', ['diffuseMap'])
            }),
            // TODO Why skydome will be affected by shadow.
            castShadow: false,
            culling: false
        });
        skydome.scale.set(15, 15, 15);
        skydome.update();
        skydome.material.set('diffuseMap', envMap);

        this._skydome = skydome;

        return envMap;
    }

    updateEnvProbe () {
        if (this._envProbe) {
            var textureCube = new qtek.TextureCube({
                width: 128,
                height: 128
            });
            var envMapPass = new qtek.prePass.EnvironmentMap({
                shadowMapPass: this._shadowMapPass,
                texture: textureCube
            });
            envMapPass.position.copy(this._envProbe.position);

            envMapPass.render(this._renderer, this._scene);

            this.setEnvMap(textureCube);

            textureCube.dispose(this._renderer.gl);
        }
    }

    setEnvMap (envMap) {
        var result = qtek.util.cubemap.prefilterEnvironmentMap(
            this._renderer, envMap, {
                width: 128,
                height: 128
            }
        );
        this._scene.traverse(function (node) {
            if (node.material) {
                node.material.environmentMap = result.environmentMap;
                node.material.brdfLookup = result.brdfLookup;
            }
        });

        this._envProbe.material.environmentMap = result.environmentMap;

        this._ambientLight.coefficients = qtek.util.sh.projectEnvironmentMap(this._renderer, result.environmentMap);

        this.render();
    }

    setSsaoParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssaoPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssaoPass.setParameter(name, value);
        this.render();
    }

    setSsrParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssrPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssrPass.setParameter(name, value);
        this.render();
    }

    setDofParameter (name, value) {
        if (name === 'focalDist' || name === 'fstop' || name === 'focalRange') {
            this._cocNode.setParameter(name, value);
            this.render();
        }
    }
}

Object.assign(ViewMain.prototype, qtek.core.mixin.notifier);

export default ViewMain;