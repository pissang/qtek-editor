
/**
 * Bridge of scene of storage and scene of rendering
 */

import qtek from 'qtek';
import colorUtil from 'zrender/lib/tool/color';
import EnvironmentProbe from './graphic/EnvironmentProbe';

var SIMPLE_PROPERTIES = ['color', 'roughness', 'alpha', 'metalness', 'emission', 'emissionIntensity', 'uvRepeat', 'uvOffset'];
var TEXTURE_PROPERTIES = ['diffuseMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
var COLOR_PROPERTIES = ['color', 'emission'];

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

function extractLightType(type) {
    return type.toLowerCase().replace('_light', '');
}

class SceneBridge {

    constructor(viewMain, option) {
        this._viewMain = viewMain;

        option = option || {};
        this.textureRootPath = option.textureRootPath;

        // TODO  Dispose unused texture
        this._textureCache = {};
    }

    loadModel (url) {
        var rootNode = new qtek.Node({
            name: url.split('/').pop()
        });
        var loader = new qtek.loader.GLTF({
            rootNode: rootNode
        });
        var self = this;

        this._modelRootNode = rootNode;

        return new Promise(function (resolve, reject) {
            loader.load(url);
            loader.success(function () {
                self._viewMain.addModel(rootNode);
                resolve(rootNode);
            }).error(function () {
                reject();
            });
        });
    }

    loadCameraAnimation (url) {
        var loader = new qtek.loader.GLTF();
        return new Promise(function (resolve, reject) {
            loader.load(url);
            loader.success(function (result) {
                resolve(result.clips);
            }).error(function () {
                reject();
            });
        });
    }

    setMaterial (mat, config) {
        var self = this;

        SIMPLE_PROPERTIES.forEach(function (prop) {
            var val = config[prop];
            if (COLOR_PROPERTIES.indexOf(prop) >= 0) {
                val = parseColor(val);
            }
            if (val != null) {
                mat[prop] = val;
            }
        });

        var isTransparent = config.alpha < 1;
        mat.transparent = isTransparent;
        mat.depthMask = !isTransparent;

        TEXTURE_PROPERTIES.forEach(function (name) {
            var textureFileName = config[name];
            if (textureFileName) {
                var path = this.textureRootPath + '/' + textureFileName;
                if (this._textureCache[path]) {
                    mat[name] = this._textureCache[path];
                    return;
                }

                var texture = mat[name] || new qtek.Texture2D({
                    wrapS: qtek.Texture.REPEAT,
                    wrapT: qtek.Texture.REPEAT,
                    anisotropic: 8
                });
                if (texture && texture.image && texture.image.src === path) {
                    return;
                }
                texture.load(path).success(function () {
                    self._viewMain.render();
                });
                // FIXME
                mat[name] = texture;

                this._textureCache[path] = texture;
            }
            else {
                mat[name] = null;
            }
        }, this);

        this._viewMain.render();
    }

    getMaterialConfig (material) {
        var config = {
            name: material.name
        };

        SIMPLE_PROPERTIES.forEach(function (propName) {
            var val = material[propName];
            if (COLOR_PROPERTIES.indexOf(propName) >= 0) {
                val = stringifyColor(val);
            }
            config[propName] = val;
        });

        TEXTURE_PROPERTIES.forEach(function (propName) {
            var texture = material[propName];
            if (texture && texture.image && texture.image.src) {
                config[propName] = texture.image.src.split('/').pop();
            }
            else {
                config[propName] = '';
            }
        });

        config.uvRepeat = config.uvRepeat || [1, 1];

        return config;
    }

    /**
     * Get light common config like transform, color
     */
    getLightBasicConfig (light) {
        light.$euler = light.$euler || new qtek.math.Vector3();
        light.$euler.eulerFromQuat(light.rotation);
        return {
            type: extractLightType(light.type),
            position: Array.prototype.slice.call(light.position._array),
            rotation: Array.prototype.slice.call(light.$euler._array),
            color: stringifyColor(light.color),
            intensity: light.intensity,

            fixedTarget: light.$fixedTarget,
            target: light.$target ? Array.prototype.slice.call(light.$target._array) : [0, 0, 0]
            // castShadow: light.castShadow
        };
    }

    /**
     * Set light from config.
     */
    setLightBasicConfig (light, config) {
        if (config.position) {
            light.position.setArray(config.position);
        }
        if (config.fixedTarget != null) {
            light.$fixedTarget = config.fixedTarget;
        }
        if (config.target) {
            light.$target = light.$target || new qtek.math.Vector3();
            light.$target.setArray(config.target);
        }

        if (light.$fixedTarget && light.$target) {
            light.lookAt(light.$target);
        }
        else if (config.rotation) {
            light.$euler = light.$euler || new qtek.math.Vector3();
            light.$euler.setArray(config.rotation);
            light.rotation.fromEuler(light.$euler);
        }

        if (config.color) {
            light.color = parseColor(config.color);
        }
        if (config.intensity != null) {
            light.intensity = config.intensity;
        }

        // light.castShadow = config.castShadow;
    }

    /**
     * Get extra light config according to the light type
     */
    getLightExtraConfig (light) {
        switch (extractLightType(light.type)) {
            case 'ambient':
            case 'directional':
                return {};
            case 'point':
                return {
                    range: light.range
                };
            case 'spot':
                return {
                    range: light.range,
                    umbraAngle: light.umbraAngle,
                    penumbraAngle: light.penumbraAngle,
                    falloffFactor: light.falloffFactor
                };
        }
    }

    /**
     * Set light from extra config according to the light type.
     */
    setLightExtraConfig (light, config) {
        switch (light.type) {
            case 'ambient':
            case 'directional':
                break;
            case 'point':
                if (config.range != null) {
                    light.range = config.range;
                }
                break;
            case 'spot':
                var props = ['range', 'umbraAngle', 'penumbraAngle', 'falloffFactor'];
                props.forEach(function (prop) {
                    if (config[prop] != null) {
                        light[prop] = config[prop];
                    }
                });
        }
    }

    createLight (config) {
        var light;
        switch (config.type) {
            case 'ambient':
                light = new qtek.light.Ambient();
                break;
            case 'directional':
                light = new qtek.light.Directional();
                break;
            case 'point':
                light = new qtek.light.Point();
                break;
            case 'spot':
                light = new qtek.light.Spot();
                break;

        }

        this.setLightBasicConfig(light, config);
        this.setLightExtraConfig(light, config);

        this._viewMain.addLight(light);

        return light;
    }

    createEnvironmentProbe (box) {
        var envProbe = new EnvironmentProbe();
        if (box && box.min && box.max) {
            var envBox = new qtek.math.BoundingBox();
            envBox.min.setArray(box.min);
            envBox.max.setArray(box.max);
            envProbe.box = envBox;
        }
        this._viewMain.addEnvironmentProbe(envProbe);

        return envProbe;
    }

    /**
     * Load scene config.
     * Including:
     *  materials,
     *  lights,
     *  postprocessings,
     *  camera
     */
    loadConfig (config) {
        var viewMain = this._viewMain;
        var self = this;
        this._modelRootNode.traverse(function (mesh) {
            var material = mesh.material;
            if (material && material.name && config.materials && config.materials[material.name]) {
                var materialConfig = config.materials[material.name];
                self.setMaterial(material, materialConfig);
            }
        });

        if (config.currentCamera) {
            viewMain.setCameraPositionAndRotation(
                config.currentCamera.position,
                config.currentCamera.rotation
            );
        }

        ['ssao', 'ssr', 'dof'].forEach(function (postProcessType) {
            for (var key in config[postProcessType]) {
                viewMain.setPostProcessParameter(postProcessType, key, config[postProcessType][key]);
            }
        });
    }

    exportMaterials (config) {

        var materialMap = {};
        if (this._modelRootNode) {
            this._modelRootNode.traverse(function (mesh) {
                var material = mesh.material;
                if (material && !materialMap[material.name]) {
                    materialMap[material.name] = {};
                    SIMPLE_PROPERTIES.forEach(function (propName) {
                        materialMap[material.name][propName] = material[propName];
                    });
                    TEXTURE_PROPERTIES.forEach(function (propName) {
                        var tex = material[propName];
                        if (tex && tex.image && tex.image.src) {
                            materialMap[material.name][propName] = tex.image.src.split('/').pop();
                        }
                    });
                }
            });
        }

        return materialMap;
    }

    getSceneTree () {
        var tree = this._buildTree(this._viewMain.getScene());
        return tree;
    }

    getNodeByName (name) {
        return this._viewMain.getScene().getNode(name);
    }

    getViewMain () {
        return this._viewMain;
    }

    _buildTree (node) {
        var root = {};

        function buildTree(parent, scope) {
            scope.name = parent.name;
            if (parent instanceof qtek.Light) {
                scope.type = 'light';
            }
            else if (parent instanceof qtek.Camera) {
                scope.type = 'camera';
            }
            else if (parent instanceof qtek.Mesh) {
                scope.type = 'mesh';
            }
            else if (parent instanceof qtek.particle.ParticleRenderable) {
                scope.type = 'particle';
            }
            else {
                scope.type = 'node';
            }

            scope.children = [];
            parent.eachChild(function (child, idx) {
                buildTree(child, scope.children[idx] = {});
            });
        }

        buildTree(node, root);

        return root;
    }
}

export default SceneBridge;