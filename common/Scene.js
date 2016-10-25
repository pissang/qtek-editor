
import qtek from 'qtek';
import colorUtil from 'zrender/lib/tool/color';

var SIMPLE_PROPERTIES = ['color', 'glossiness', 'alpha', 'metalness', 'emission', 'emissionIntensity'];
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

class Scene {

    constructor(viewMain, option) {
        this._viewMain = viewMain;

        option = option || {};
        this.textureRootPath = option.textureRootPath;

        // TODO  Dispose unused texture
        this._textureCache = {};
    }

    loadModel (url) {
        var rootNode = new qtek.Node();
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

    setMaterial (mat, config) {
        var self = this;
        var enabledTextures = TEXTURE_PROPERTIES.filter(function (name) {
            return config[name];
        });
        this._updateShader(mat, enabledTextures);

        SIMPLE_PROPERTIES.forEach(function (prop) {
            var val = config[prop];
            if (COLOR_PROPERTIES.indexOf(prop) >= 0) {
                val = parseColor(val);
            }
            if (val != null) {
                mat.set(prop, val);
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
                    mat.set(name, this._textureCache[path]);
                    return;
                }

                var texture = mat.get(name) || new qtek.Texture2D({
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
                mat.set(name, texture);

                this._textureCache[path] = texture;
            }
            else {
                mat.set(name, null);
            }
        }, this);

        mat.set('uvRepeat', [+config.uvRepeat0 || 1, +config.uvRepeat1 || 1]);

        this._viewMain.render();
    }

    _updateShader (mat, enabledTextures) {
        enabledTextures = enabledTextures.concat(['environmentMap', 'brdfLookup', 'ssaoMap']);
        enabledTextures = enabledTextures.concat(['ssaoMap']);
        var shader = qtek.shader.library.get('qtek.standard', {
            textures: enabledTextures,
            fragmentDefines: {
                ENVIRONMENTMAP_PREFILTER: null,
                RGBM_ENCODE: null,
                USE_METALNESS: null,
                SRGB_DECODE: null
            }
        });
        if (shader !== mat.shader) {
            mat.attachShader(shader, true);
        }
    }

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

        for (var name in config.ssao) {
            viewMain.setSsaoParameter(name, config.ssao[name]);
        }
        for (var name in config.ssr) {
            viewMain.setSsrParameter(name, config.ssr[name]);
        }
        for (var name in config.dof) {
            viewMain.setDofParameter(name, config.dof[name]);
        }
    }

    exportMaterials (config) {

        var materialMap = {};
        if (this._modelRootNode) {
            this._modelRootNode.traverse(function (mesh) {
                var material = mesh.material;
                if (material) {
                    materialMap[material.name] = {};
                    SIMPLE_PROPERTIES.forEach(function (propName) {
                        materialMap[material.name][propName] = material.get(propName);
                    });
                    TEXTURE_PROPERTIES.forEach(function (propName) {
                        var tex = material.get(propName);
                        if (tex && tex.image && tex.image.src) {
                            materialMap[material.name][propName] = tex.image.src.split('/').pop();
                        }
                    });
                    var uvRepeat = material.get('uvRepeat');
                    if (uvRepeat) {
                        materialMap[material.name].uvRepeat0 = uvRepeat[0];
                        materialMap[material.name].uvRepeat1 = uvRepeat[1];
                    }
                }
            });
        }

        return materialMap
    }
}

export default Scene;