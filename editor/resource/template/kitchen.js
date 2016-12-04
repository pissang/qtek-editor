module.exports = {
    load: function (sceneBridge, store, cb) {
        sceneBridge.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);

                sceneBridge.getViewMain().focusOn(rootNode);

                cb && cb();

                sceneBridge.getViewMain().loadPanorama('asset/texture/Mans_Outside_2k.hdr', 0.5);

                sceneBridge.getViewMain().updateEnvProbe();

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