<template>
<div class="ui-property-range">
    <input type="range" :step="option.step" :min="option.min" :max="option.max" v-model="value">
    <input type="text" v-model="value" lazy  number>
</div>
</template>

<script>
export default {

    name: 'range',

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