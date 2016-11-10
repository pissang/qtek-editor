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

<style lang="sass">

.ui-property-range {
    input {
        vertical-align: middle;
        display: inline-block;
    }
    input[type=text] {
        width: 40px;
    }

    input[type=range] {
        -webkit-appearance: none;
        cursor: pointer;
    }

    input[type=range]::-webkit-slider-runnable-track {
        width: 300px;
        height: 2px;
        background: #777;
        border: none;
        border-radius: 3px;
    }

    input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none;
        border: none;
        height: 14px;
        width: 14px;
        border-radius: 50%;
        background: #aaa;
        margin-top: -6px;
    }

    input[type=range]:focus {
        outline: none;
    }

    input[type=range]:focus::-webkit-slider-runnable-track {
        background: #ccc;
    }

}

</style>