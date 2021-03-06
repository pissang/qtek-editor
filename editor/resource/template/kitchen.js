module.exports = {
    load: function (sceneBridge, store, cb) {
        // Light
        var light = sceneBridge.createLight({
            type: 'directional',
            color: [1, 1, 1],
            intensity: 10,
            position: [-5, 7, -18],
            fixedTarget: true,
            target: [0, 0, 0]
        });
        light.shadowBias = 0.005;
        light.shadowResolution = 2048;

        sceneBridge.createEnvironmentProbe({
            min: [-2.6346957683563232, 0, -3.347585678100586],
            max: [3.284651517868042, 3.20135760307312, 5.092456817626953]
        })

        sceneBridge.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);

                sceneBridge.getViewMain().focusOn(rootNode);

                cb && cb();

                sceneBridge.getViewMain().loadPanorama('asset/texture/Mans_Outside_2k.hdr', -1);

                sceneBridge.getViewMain().updateEnvironmentProbe();

                sceneBridge.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
                    .then(function (clips) {
                        store.clips.length = 0;
                        store.clipNames.length = 0;
                        for (let key in clips) {
                            store.clipNames.push(key);
                            store.clips.push(clips[key]);
                        }
                    });

                store.sceneTree.root = sceneBridge.getSceneTree();

        });
    }
};