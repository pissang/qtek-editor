import qtek from 'qtek';
import GBuffer from './graphic/GBuffer';
// import SSAOPass from './graphic/SSAOPass';
import SSAOPass from './graphic/AlchemyAOPass';
import SSRPass from './graphic/SSRPass';
import eventBus from './eventBus';
import TemporalSuperSampling from './graphic/TemporalSuperSampling';

var hdrJson = JSON.parse(require('text!./graphic/composite.json'));

class ViewMain {
    constructor(dom, option) {
        option = option || {};

        this.enableSSAO = true;
        this.enableSSR = true;

        var renderer = new qtek.Renderer({
            canvas: document.createElement('canvas'),
            devicePixelRatio: 1
        });

        var camera = new qtek.camera.Perspective();
        var scene = new qtek.Scene({
            name: 'Scene'
        });

        this._dom = dom;
        this._renderer = renderer;
        this._camera = camera;
        this._scene = scene;

        dom.appendChild(renderer.canvas);

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
        this._rawOutput = new qtek.Texture2D({
            type: qtek.Texture.HALF_FLOAT
        });
        this._temporalSSFb = new qtek.FrameBuffer({
            depthBuffer: false
        });
        this._postProcessOutput = new qtek.Texture2D();

        this._shadowMapPass = new qtek.prePass.ShadowMap({
        });

        this._temporalSSPass = new TemporalSuperSampling();

        this._initCompositor();

        this._debugPass = new qtek.compositor.Pass({
            fragment: qtek.Shader.source('qtek.compositor.output')
        });

        this.resize();

        var animation = new qtek.animation.Animation();
        animation.start();
        animation.on('frame', function () {
            if (this._needsUpdate) {
                this._temporalSSPass.resetFrame();
                this.renderImmediately();
            }
            else if (!this._temporalSSPass.isFinished()) {
                this.renderImmediately(true);
            }
        }, this);

        this._animation = animation;

        scene.on('beforerender', function () {
            this._temporalSSPass.jitterProjection(renderer, camera);
        }, this);
    }

    addModel (rootNode) {
        var ssaoMap = this._ssaoPass.getTargetTexture();
        var materialMap = {};
        rootNode.traverse(function (mesh) {
            var geometry = mesh.geometry;
            if (geometry) {
                mesh.culling = false;
                mesh.beforeRender = function () {
                    mesh.material.shader.define('fragment', 'SSAOMAP_ENABLED');
                    mesh.material.set('ssaoMap', ssaoMap);
                };
                if (geometry.attributes.texcoord0.value) {
                    geometry.generateTangents();
                }
                var material = materialMap[mesh.material.name] || new qtek.StandardMaterial({
                    name: mesh.material.name,
                    environmentMapPrefiltered: true,
                    decodeRGBM: true
                });
                materialMap[mesh.material.name] = material;
                mesh.material = material;
            }
        });
        this._scene.add(rootNode);
        this.render();
    }

    addLight (light) {
        this._scene.add(light);
    }

    addEnvironmentProbe (envProbe) {
        // var sphere = new qtek.Mesh({
        //     geometry: new qtek.geometry.Sphere(),
        //     material: new qtek.StandardMaterial({
        //         color: [1, 1, 1],
        //         roughness: 0,
        //         metalness: 1
        //     })
        // });
        // sphere.scale.set(0.2, 0.2, 0.2);

        // sphere.update();

        this._envProbe = envProbe;
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
        var lensflareTex = new qtek.Texture2D();
        var lensdirtTex = new qtek.Texture2D();
        self._sourceNode = self._compositor.getNodeByName('source');
        // lutTex.load('asset/texture/sedona.png')
        // lutTex.load('asset/texture/lut.png')
        lutTex.load('asset/texture/lut/filmstock_50.png')
            .success(function () {
                self.render();
            });

        lensflareTex.load('asset/texture/lensflare/lenscolor.png').success(function () { self.render(); });
        lensdirtTex.load('asset/texture/lensflare/lensdirt2.jpg').success(function () { self.render(); });

        var finalCompositeNode = this._compositor.getNodeByName('composite');
        finalCompositeNode.shaderDefine('lut');
        finalCompositeNode.setParameter('lut', lutTex);
        finalCompositeNode.setParameter('lensdirt', lensdirtTex);

        this._compositor.getNodeByName('lensflare').setParameter('lenscolor', lensflareTex);

        this._cocNode = self._compositor.getNodeByName('coc');
    }

    _initScene () {
        var scene = this._scene;

        var ambientLight = new qtek.light.AmbientSH({
            // Init coefficients
            coefficients: [0.8450393676757812, 0.7135089635848999, 0.6934053897857666, 0.02310405671596527, 0.17135757207870483, 0.28332242369651794, 0.343019962310791, 0.2880895435810089, 0.2998031973838806, 0.08001846075057983, 0.10719859600067139, 0.12824314832687378, 0.003927173092961311, 0.04206192493438721, 0.06470289081335068, 0.036095526069402695, 0.04928380250930786, 0.058642253279685974, -0.009344635531306267, 0.06963406503200531, 0.1312279999256134, -0.05935414880514145, -0.04865729808807373, -0.060036804527044296, 0.04625355824828148, 0.0563165508210659, 0.050963230431079865],
            intensity: 0.3
            // color: [250 / 255, 214 / 255, 165 / 255]
        });
        scene.add(ambientLight);

        this._ambientLight = ambientLight;
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

        var confirmDrag = false;
        var startX = 0;
        var startY = 0;
        this._dom.addEventListener('mousedown', function (e) {
            startX = e.offsetX;
            startY = e.offsetY;
        });
        this._dom.addEventListener('mouseup', function (e) {
            var dx = e.offsetX - startX;
            var dy = e.offsetY - startY;
            confirmDrag = Math.sqrt(dx * dx + dy * dy) > 20;
        });

        this._dom.addEventListener('click', function (e) {
            // Not trigger click if it is a drag
            if (confirmDrag) {
                return;
            }

            var x = e.offsetX;
            var y = e.offsetY;
            var result = picking.pick(x, y);
            if (result) {
                lastSelected = result.target;

                eventBus.$emit('select', result.target);
            }
            else if (lastSelected) {
                lastSelected = null;
            }

            self.render();
        });
    }

    getCamera () {
        return this._camera;
    }

    getScene () {
        return this._scene;
    }

    getRenderer () {
        return this._renderer;
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
        this._temporalSSPass.resetFrame();
        this._needsUpdate = true;
    }


    // Hook for render other objects share same depth buffer
    // renderOthersShareDepthBuffer() {}

    // Hook for render other objects
    // renderOthersAfterCompositing() {}

    renderImmediately (accumulateStage) {
        this._needsUpdate = false;
        var time = Date.now();

        var renderer = this._renderer;

        var scene = this._scene;
        var camera = this._camera;
        scene.update();
        camera.update();
        this._gBuffer.update(renderer, scene, camera);

        if (this.enableSSAO) {
            this._ssaoPass.render(renderer, camera);
        }
        else {
            this._ssaoPass.clear(renderer);
        }

        this._shadowMapPass.render(renderer, scene, camera);
        this._colorFb.attach(this._rawOutput);
        this._colorFb.bind(renderer);
        var renderStat = renderer.render(scene, camera, true, true);

        if (this._skydome) {
            renderer.renderQueue([this._skydome], camera);
        }

        if (this.renderOthersShareDepthBuffer) {
            this.renderOthersShareDepthBuffer(renderer, scene, camera);
        }


        this._colorFb.unbind(renderer);

        if (this.enableSSR) {
            this._ssrPass.render(renderer, camera, this._rawOutput, this._ssaoPass.getTargetTexture());
            if (this._sourceNode) {
                this._sourceNode.setParameter('texture', this._ssrPass.getTargetTexture());
                this._sourceNode.shaderDefine('RGBM');
                this._sourceNode.shaderUnDefine('RGBM_ENCODE');
            }
        }
        else {
            if (this._sourceNode) {
                this._sourceNode.setParameter('texture', this._rawOutput);
                this._sourceNode.shaderUnDefine('RGBM');
                this._sourceNode.shaderDefine('RGBM_ENCODE');
            }
        }

        this._cocNode.setParameter('depth', this._gBuffer.getDepthTex());

        this._temporalSSFb.attach(this._postProcessOutput);
        this._compositor.render(renderer, this._temporalSSFb);

        if (this.renderOthersAfterCompositing) {
            this._temporalSSFb.bind(renderer);
            renderer.gl.clear(renderer.gl.DEPTH_BUFFER_BIT);
            this.renderOthersAfterCompositing(renderer, scene, camera);
            this._temporalSSFb.unbind(renderer);
        }

        this._temporalSSPass.render(renderer, this._postProcessOutput);

        // this._debugPass.setUniform('texture', this._rawOutput);
        // this._debugPass.render(renderer);
        // this._shadowMapPass.renderDebug(renderer);


        renderStat.renderTime = Date.now() - time;

        eventBus.$emit('render', renderStat);
    }

    resize () {
        var width = this._dom.clientWidth;
        var height = this._dom.clientHeight;

        this._renderer.resize(width, height);
        this._camera.aspect = this._renderer.getViewportAspect();

        this._rawOutput.width = width;
        this._rawOutput.height = height;
        this._rawOutput.dirty();

        this._postProcessOutput.width = width;
        this._postProcessOutput.height = height;
        this._postProcessOutput.dirty();

        this._temporalSSPass.resize(width, height);

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

        var bbox = node.getBoundingBox();
        bbox.applyTransform(node.worldTransform);

        var z = this._camera.worldTransform.z;

        var cp = new qtek.math.Vector3();
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

                cb && cb(envMap);
            }
        );
        // TODO Use box
        var skydome = new qtek.Mesh({
            geometry: new qtek.geometry.Sphere(),
            material: new qtek.Material({
                shader: qtek.shader.library.get('qtek.basic', ['diffuseMap'])
            }),
            castShadow: false,
            culling: false
        });
        skydome.scale.set(1000, 1000, 1000);
        skydome.update();
        skydome.material.set('diffuseMap', envMap);

        this._skydome = skydome;

        return envMap;
    }

    updateEnvironmentProbe () {
        if (this._envProbe) {
            var envProbe = this._envProbe;

            envProbe.updateEnvironment(
                this._renderer, this._scene, this._shadowMapPass
            );

            this._envProbeUpdated();
        }
    }

    /**
     * Set environment map for Image Based Lighting
     */
    setEnvironmentMap (envMap) {
        if (this._envProbe) {
            this._envProbe.setEnvironmentMap(this._renderer, envMap);
            this._envProbeUpdated();
        }
    }

    _envProbeUpdated () {
        var envProbe = this._envProbe;

        this._scene.traverse(function (node) {
            if (node.material) {
                node.material.environmentMap = envProbe.getEnvironmentMap();
                node.material.brdfLookup = envProbe.getBRDFLookup();
                node.material.environmentBox = envProbe.box;
            }
        }, this);

        this._ambientLight.coefficients = envProbe.getSHCoefficient();

        this.render();
    }

    setSSAOParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssaoPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssaoPass.setParameter(name, value);
        this.render();
    }

    setSSRParameter (name, value) {
        if (typeof name === 'object') {
            for (var key in name) {
                this._ssrPass.setParameter(key, name[key]);
            }
            return;
        }
        this._ssrPass.setParameter(name, value);
        this.render();
    }

    setDOFParameter (name, value) {
        if (name === 'focalDist' || name === 'fstop' || name === 'focalRange') {
            this._cocNode.setParameter(name, value);
            this.render();
        }
    }

    setPostProcessParameter (processType, name, value) {
        switch (processType) {
            case 'ssao':
                this.setSSAOParameter(name, value);
                break;
            case 'ssr':
                this.setSSRParameter(name, value);
                break;
            case 'dof':
                this.setDOFParameter(name, value);
                break;
        }
    }
}

export default ViewMain;