<template>
<div class="property-texture">
    <div class="property-texture-upload-container">
        <img :src="value ? (option.textureRootPath + '/' + value ) : ''">
        <div class="property-texture-upload">UPLOAD</div>
    </div>
    <button @click="clear">清除</button>
</div>
</template>

<script>
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
        this.$el.querySelector('.property-texture-upload').addEventListener('click', function () {
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
.property-texture {
    min-height: 50px;

    .property-texture-upload-container {
        position: relative;
    }

    .property-texture-upload {
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
    img {
        width: 100%;
    }
}
</style>