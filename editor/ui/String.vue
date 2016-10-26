<template>
<input type="text" v-model="value">
</template>

<script>
module.exports = {
    props: {
        value: {
            type: String,
            default: ''
        }
    }
};
</script>