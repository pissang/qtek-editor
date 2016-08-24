<template>
<input type="color" v-model="value">
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

<style>

</style>