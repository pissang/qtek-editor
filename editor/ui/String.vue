<template>
<input type="text" v-model="value">
</template>

<script>
export default {
    props: {
        value: {
            type: String,
            default: ''
        }
    }
};
</script>