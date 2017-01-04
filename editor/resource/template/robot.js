module.exports = {
    load: function (sceneBridge, store, cb) {
        // Light
        var light = sceneBridge.createLight({
            type: 'directional',
            color: [1, 1, 1],
            intensity: 1,
            position: [-5, 7, 2],
            fixedTarget: true,
            target: [0, 0, 0]
        });
        light.shadowBias = 0.005;
        light.shadowResolution = 2048;

        sceneBridge.createEnvironmentProbe();

        sceneBridge.loadModel('asset/model/robot/robot.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);
                rootNode.scale.set(0.1, 0.1, 0.1);

                sceneBridge.getViewMain().focusOn(rootNode);

                cb && cb();

                sceneBridge.getViewMain().loadPanorama('asset/texture/pisa.hdr', 1, function (envmap) {
                    sceneBridge.getViewMain().setEnvironmentMap(envmap);
                });

                store.sceneTree.root = sceneBridge.getSceneTree();
        });
    }
};