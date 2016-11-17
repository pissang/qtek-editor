<template>
<div class="ui-tree-item">
    <div href="javascript:;" class="ui-tree-header" @click="select" :class="(tree.selected === node.name) && 'selected'">
        <span v-if="node.children && node.children.length" :class="['icon', collapsed ? 'icon-unfold' : 'icon-fold']" @click="toggleCollapsed"></span>
        <span :class="['icon', 'icon-' + node.type]"></span>
        <span>{{ node.name }}</span>
    </div>
    <ul v-if="node.children && node.children.length" :class="['ui-tree-body', collapsed ? 'collapsed' : '']">
        <li v-for="child in node.children">
            <tree-item :tree="tree" :node="child" :depth="depth + 1"></tree-item>
        </li>
    </ul>
</div>
</template>

<script>
export default {

    name: 'tree-item',

    props: {
        node: Object,

        tree: Object,

        depth: {
            type: Number,
            default: 0
        }
    },

    data () {
        return {
            collapsed: false,
        }
    },

    methods: {

        select () {
            this.tree.selected = this.node.name;
        },

        toggleCollapsed () {
            this.collapsed = !this.collapsed;
        }
    },

    ready () {
        this.collapsed = this.depth > 0;
    }
};
</script>