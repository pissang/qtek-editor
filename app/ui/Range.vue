<template>
<input type="range" :step="option.step" :min="option.min" :max="option.max" v-model="value">
</template>

<script>
module.exports = {
    props: {
        value: {
            type: Number,
            default: 0
        },
        option: {
            type: Object,
            default: function () {
                return {
                    min: 0,
                    max: 1,
                    step: 0.01
                };
            }
        }
    }
};
</script>

<style>

</style>