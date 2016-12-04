<template>
<div class="ui-property-enum">
    <select v-model="value">
        <option value="{{item.value}}" v-for="item in options">{{item.title}}</option>
    </select>
</div>
</template>

<script>
export default {

    name: 'enum',

    props: {
        value: {
            type: String,
            default: ''
        },
        option: {
            type: Object,
            default: function () {
                return {
                    options: []
                };
            }
        }
    }
};
</script>