<template>
<div class="ui-property-color">
    <input type="color" v-model="value">
    <input type="text" v-model="value" lazy>
</div>
</template>

<script>
export default {

    name: 'color',

    props: {
        value: {
            type: String,
            default: '#ffffff'
        }
    }
};
</script>

<style lang='sass'>
.ui-property-color {
    input {
        vertical-align: middle;
        display: inline-block;
    }
}
</style>