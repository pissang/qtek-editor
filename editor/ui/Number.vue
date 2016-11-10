<template>
<div class="ui-property-number">
    <input type="number" v-model="value" number>
</div>
</template>

<script>
export default {

    name: 'number',

    props: {
        value: {
            type: Number,
            default: 0
        }
    }
};
</script>