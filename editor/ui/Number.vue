<template>
<input type="number" v-model="value" number>
</template>

<script>
export default {
    props: {
        value: {
            type: Number,
            default: 0
        }
    }
};
</script>