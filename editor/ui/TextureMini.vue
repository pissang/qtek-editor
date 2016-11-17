<template>
<div class="ui-property-texture-mini">
    <div :class="['texture-upload', value ? '' : 'empty']">
        <img :src="value ? (option.textureRootPath + '/' + value ) : 'editor/img/chessboard.jpg'">
    </div>
    <div class="texture-clear" @click="clear" v-show="value">
        <span class="glyphicon glyphicon-remove"></span>
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