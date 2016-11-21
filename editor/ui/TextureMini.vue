<template>
<div class="ui-property-texture-mini">
    <div :class="['texture-upload', value ? '' : 'empty']" @click="upload">
        <img :src="value ? (option.textureRootPath + '/' + value ) : 'editor/img/chessboard.jpg'">
    </div>
    <div class="texture-op" @click="value ? clear() : upload()">
        <span :class="['glyphicon', value ? 'glyphicon-remove' : 'glyphicon-upload']"></span>
    </div>
</div>
</template>

<script>

// var defaultImg = 'editor/img/chessboard.jpg';
export default {

    name: 'texture-mini',

    props: {
        value: {
            type: String,
            default: ''
        },

        option: {
            type: Object,
            default: function () {
                return {
                    textureRootPath: ''
                };
            }
        }
    },
    methods: {

        upload: function () {
            var self = this;
            var $input = $('<input type="file" />');
            $input[0].addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (file) {
                    self.value = file.name;
                }
            });
            $input.click();
        },

        clear: function () {
            this.value = '';
        }
    }
};
</script>