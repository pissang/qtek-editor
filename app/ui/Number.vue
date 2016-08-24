<template>
<input type="number" v-model="value">
</template>

<script>
module.exports = {
    props: {
        value: {
            type: Number,
            default: 0
        }
    }
};
</script>

<style>

</style>