<template>
<div class="ui-tree">
    <tree-item v-if="tree.root" :tree="tree" :node="tree.root" :depth="0"></tree-item>
</div>
</template>

<script>

import TreeItem from './TreeItem.vue'

module.exports = {
    name: 'tree',
    props: {
        tree: Object
    },
    components: {
        'tree-item': TreeItem
    }
}
</script>