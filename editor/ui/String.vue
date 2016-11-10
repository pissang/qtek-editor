<template>
<input type="text" v-model="value">
</template>

<script>
export default {

    name: 'string',

    props: {
        value: {
            type: String,
            default: ''
        }
    }
};
</script>