<template>
<div class="ui-property-number-vector">
    <div v-for="item in value" track-by="$index">
        <number :value.sync="item"></number>
    </div>
</div>
</template>

<script>

import VNumber from './Number.vue';

export default {

    name: 'vector',

    props: {
        value: Array
    },

    components: {
        number: VNumber
    }
};
</script>

<style lang="sass">
</style>