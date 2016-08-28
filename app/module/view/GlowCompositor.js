var qtek = require('qtek');
qtek.Shader.import(require('text!./compositor.essl'));

function GlowCompositor(scene, camera) {

    var compositor = new qtek.compositor.Compositor();

    var halfSizeParameters = {
        width: function (renderer) {
            return renderer.getWidth() / 2;
        },
        height: function (renderer) {
            return renderer.getHeight() / 2;
        }
    };

    var sceneNode = new qtek.compositor.SceneNode({
        scene: scene,
        camera: camera,
        outputs: {
            color: {
                parameters: {
                    width: function (renderer) {
                        return renderer.getWidth();
                    },
                    height: function (renderer) {
                        return renderer.getHeight();
                    },
                    minFilter: qtek.Texture.NEAREST,
                    magFilter: qtek.Texture.NEAREST
                }
            }
        }
    });

    var brightNode = new qtek.compositor.Node({
        name: 'bright',
        shader: qtek.Shader.source('bd.compositor.bright'),
        inputs: {
            texture: {
                node: sceneNode,
                pin: 'color'
            }
        },
        outputs: {
            color: {
                parameters: halfSizeParameters
            }
        }
    });
    brightNode.setParameter('threshold', 0);
    brightNode.setParameter('scale', 2);


    this._gaussianNodes = [];
    var gaussianBlurVNode;
    for (var i = 0; i < 2; i++) {
        var gaussianBlurHNode = new qtek.compositor.Node({
            shader: qtek.Shader.source('buildin.compositor.gaussian_blur_h'),
            inputs: {
                texture: {
                    node: gaussianBlurVNode || brightNode,
                    pin: 'color'
                }
            },
            outputs: {
                color: {
                    parameters: halfSizeParameters
                }
            }
        });

        gaussianBlurVNode = new qtek.compositor.Node({
            shader: qtek.Shader.source('buildin.compositor.gaussian_blur_v'),
            inputs: {
                texture: {
                    node: gaussianBlurHNode,
                    pin: 'color'
                }
            },
            outputs: {
                color: {
                    parameters: halfSizeParameters
                }
            }
        });
        compositor.addNode(gaussianBlurHNode);
        compositor.addNode(gaussianBlurVNode);

        this._gaussianNodes.push(gaussianBlurHNode, gaussianBlurVNode);
    }

    var blendNode = new qtek.compositor.Node({
        shader: qtek.Shader.source('bd.compositor.blend'),
        inputs: {
            texture1: {
                node: gaussianBlurVNode,
                pin: 'color'
            },
            texture2: {
                node: sceneNode,
                pin: 'color'
            }
        }
    });
    blendNode.setParameter('weight1', 2);
    blendNode.setParameter('weight2', 1);

    compositor.addNode(sceneNode);
    compositor.addNode(brightNode);
    compositor.addNode(blendNode);

    this.compositor = compositor;
}

GlowCompositor.prototype.render = function (renderer) {
    this.compositor.render(renderer);

    this._gaussianNodes.forEach(function (node) {
        node.setParameter('blurSize', 1);
        node.setParameter('textureWidth', renderer.getWidth() / 2);
        node.setParameter('textureHeight', renderer.getHeight() / 2);
    });
};

module.exports = GlowCompositor;