import ViewMain from '../common/ViewMain';
import SceneBridge from '../common/SceneBridge';
import qtek from 'qtek';

export default {

    data () {
        return {};
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot);
        var sceneBridge = this._sceneBridge = new SceneBridge(viewMain, {
            textureRootPath: 'asset/model/kitchen/texture/'
        });

        function playAnimationSequerence(clips) {
            function randomClipIndex(lastIndex) {
                return (lastIndex + 1) % clips.length;
                // return (lastIndex + Math.round(Math.random()) + 1) % clips.length;
            }
            function playClip(clipIndex) {
                var clip = clips[clipIndex];
                clip.playbackRate = 0.8;
                clip.onfinish = function () {
                    playClip(randomClipIndex(clipIndex));
                };
                viewMain.playCameraAnimation(clip);
            }
            playClip(0);
        }

        // Light
        var light = sceneBridge.createLight({
            type: 'directional',
            color: [1, 1, 1],
            intensity: 10,
            position: [-5, 7, -18],
            fixedTarget: true,
            target: [0, 0, 0]
        });
        light.shadowCascade = 4;
        light.cascadeSplitLogFactor = 0;
        light.shadowBias = 0.005;
        light.shadowResolution = 2048;

        sceneBridge.createEnvironmentProbe({
            min: [-2.6346957683563232, 0, -3.347585678100586],
            max: [3.284651517868042, 3.20135760307312, 5.092456817626953]
        })

        sceneBridge.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                rootNode.rotation.rotateX(-Math.PI / 2);

                viewMain.loadPanorama('asset/texture/Mans_Outside_2k.hdr', 0.5);

                $.getJSON('asset/model/kitchen/mat.json').then(function (config) {
                    sceneBridge.loadConfig(config);

                    viewMain.updateEnvironmentProbe();

                    sceneBridge.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
                        .then(function (clips) {
                            var clipsArr = [];
                            for (var name in clips) {
                                clipsArr.push(clips[name]);
                            }

                            playAnimationSequerence(clipsArr);
                        });

                    viewMain.render();
                });
            });

        // var audio = document.createElement('audio');
        // audio.src = 'asset/sound/bensound-acousticbreeze.mp3';
        // audio.autoplay = true;
        // audio.loop = true;

        window.addEventListener('resize', function () { viewMain.resize(); });
    }
};