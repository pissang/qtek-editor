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