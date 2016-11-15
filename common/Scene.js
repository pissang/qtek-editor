
import qtek from 'qtek';
import colorUtil from 'zrender/lib/tool/color';

var SIMPLE_PROPERTIES = ['color', 'roughness', 'alpha', 'metalness', 'emission', 'emissionIntensity', 'uvRepeat'];
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
            else if (parent instanceof qtek.particleSystem.ParticleRenderable) {
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

export default Scene;