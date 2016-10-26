<template>
<div class="ui-property-texture">
    <div :class="['ui-property-texture-upload-container', value ? '' : 'empty']">
        <img :src="value ? (option.textureRootPath + '/' + value ) : 'editor/img/chessboard.jpg'">
        <div class="ui-property-texture-upload">UPLOAD</div>
    </div>
    <button @click="clear">清除</button>
</div>
</template>

<script>

// var defaultImg = 'editor/img/chessboard.jpg';
module.exports = {
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
        this.$el.querySelector('.ui-property-texture-upload').addEventListener('click', function () {
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

<style lang="sass">
.ui-property-texture {
    min-height: 50px;

    .ui-property-texture-upload-container {
        position: relative;
        img {
            max-width: 100%;
        }

        &.empty {
            img {
                opacity: 0.4;
                width: 100px;
            }
        }
    }

    .ui-property-texture-upload {
        line-height: 100%;
        font-size: 20px;
        color: rgba(255, 255, 255, 0.7);
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
        cursor: pointer;

    }
}
</style>