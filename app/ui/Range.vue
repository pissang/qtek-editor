<template>
<div class="property-range">
    <input type="range" :step="option.step" :min="option.min" :max="option.max" v-model="value">
    <input class="property-range-text" type="text" v-model="value" lazy>
</div>
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
.property-range-text {
    width: 40px;
}
</style>