<template>
<div class="ui-property-string">
    <input type="text" v-model="value">
</div>
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