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
                return (lastIndex + 1) & clips.length;
                // return (lastIndex + Math.round(Math.random()) + 1) % clips.length;
            }
            function playClip(clipIndex) {
                var clip = clips[clipIndex];
                clip.playbackRate = 0.4;
                clip.onfinish = function () {
                    playClip(randomClipIndex(clipIndex));
                };
                viewMain.playCameraAnimation(clip);
            }
            playClip(0);
        }

        sceneBridge.loadModel('asset/model/kitchen/kitchen.gltf')
            .then(function (rootNode) {
                viewMain.loadPanorama('asset/texture/Mans_Outside_2k.hdr', 0.5);
                viewMain.updateEnvProbe();
                rootNode.rotation.rotateX(-Math.PI / 2);

                $.getJSON('asset/model/kitchen/mat.json').then(function (config) {
                    sceneBridge.loadConfig(config);
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