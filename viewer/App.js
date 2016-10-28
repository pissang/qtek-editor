import ViewMain from '../common/ViewMain';
import Scene from '../common/Scene';
import qtek from 'qtek';

export default {

    data () {
        return {};
    },

    ready () {
        var viewRoot = this.$el.querySelector('.view-main');
        var viewMain = this._viewMain = new ViewMain(viewRoot);
        var sceneLevel = this._sceneLevel = new Scene(viewMain, {
            textureRootPath: 'asset/model/kitchen/texture/'
        });

        function playAnimationSequerence(clips) {
            function randomClipIndex(lastIndex) {
                return (lastIndex + Math.round(Math.random()) + 1) % clips.length;
            }
            function playClip(clipIndex) {
                var clip = clips[clipIndex];
                clip.onfinish = function () {
                    playClip(randomClipIndex(clipIndex));
                };
                viewMain.playCameraAnimation(clip);
            }
            playClip(1);
        }

        sceneLevel.loadModel('asset/model/kitchen/kitchen-mod.gltf')
            .then(function (rootNode) {
                viewMain.loadPanorama('http://' + window.location.host + '/baidu-screen/asset/texture/hall.hdr', -0.5, function () {
                    viewMain.updateEnvProbe();
                });
                rootNode.rotation.rotateX(-Math.PI / 2);

                $.getJSON('asset/model/kitchen/mat-mod.json').then(function (config) {
                    sceneLevel.loadConfig(config);
                    sceneLevel.loadCameraAnimation('asset/model/kitchen/camera01-05.gltf')
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

        window.addEventListener('resize', function () { viewMain.resize(); });
    }
};