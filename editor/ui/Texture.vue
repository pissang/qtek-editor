<template>
<div class="ui-property-texture">
    <div :class="['texture-upload-container', value ? '' : 'empty']">
        <img :src="value ? (option.textureRootPath + '/' + value ) : 'editor/img/chessboard.jpg'">
        <div class="texture-upload">UPLOAD</div>
    </div>
    <button @click="clear">清除</button>
</div>
</template>

<script>

// var defaultImg = 'editor/img/chessboard.jpg';
export default {

    name: 'texture',

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
    ready () {
        var self = this;
        this.$el.querySelector('.texture-upload').addEventListener('click', function () {
            var $input = $('<input type="file" />');
            $input[0].addEventListener('change', function (e) {
                var file = e.target.files[0];
                if (file) {
                    self.value = file.name;
                }
            });
            $input.click();
        });
    },
    methods: {
        clear: function () {
            this.value = '';
        }
    }
};
</script>
