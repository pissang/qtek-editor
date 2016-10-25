<template>
<div class="property-color">
    <input type="color" v-model="value">
    <input type="text" v-model="value" lazy>
</div>
</template>

<script>
module.exports = {
    props: {
        value: {
            type: String,
            default: '#ffffff'
        }
    }
};
</script>

<style lang='sass'>
.property-color {
    input {
        vertical-align: middle;
        display: inline-block;
    }
}
</style>