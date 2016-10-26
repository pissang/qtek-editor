<template>
<div class="ui-tree-item">
    <a href="javascript:;" class="ui-tree-header">
        <span :class="['icon', collapse ? 'icon-unfold' : 'icon-fold']"></span>
        <span>{{ model.title }}</span>
    </a>
    <ul class="ui-tree-body">
        <li v-for="child as model.children">
            <tree :model="model"></tree>
        </li>
    </ul>
</div>
</template>

<script>
module.exports = {
    props: {
        model: Object
    },

    data () {
        return {
            collapse: false
        }
    },

    methods: {
        toggleCollapse () {
            this.collapse = !this.collapse;
        }
    }
};
</script>

<style lang="sass">
.ui-tree-header {
    span {
        display: inline-block;
        vertical-align: middle;
    }
}
</style>