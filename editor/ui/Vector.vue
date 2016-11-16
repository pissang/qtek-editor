<template>
<div class="ui-property-number-vector">
    <div v-for="item in value" track-by="$index" class="ui-property-vector-item">
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
.ui-property-number-vector {
    .ui-property-vector-item {
        display: inline-block;
        width: 70px;
        margin-right: 5px;

        input {
            width: 100%;
        }
    }
}
</style>