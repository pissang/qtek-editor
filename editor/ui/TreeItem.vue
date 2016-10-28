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

<style lang="sass">
.ui-tree-header {
    color: #aaa;
    font-size: 12px;
    line-height: 20px;
    cursor: pointer;

    span {
        display: inline-block;
        vertical-align: middle;
    }

    .icon {
        color: #666;
        font-size: 15px;
        padding-left: 6px;
    }

    .icon-fold, .icon-unfold {
        font-size: 12px;
        color: #aaa;
        margin-left: -16px;
        padding-left: 0;

        width: 12px;
    }

    &.selected {
        background: #aaa;
        color: #333;
    }
}

.ui-tree-item {
    margin-left: 15px;

    ul {
        margin: 0;
        padding: 0;
    }
    li {
        list-style: none;
    }
}

.ui-tree-body {
    &.collapsed {
        height: 0;
        overflow: hidden;
    }
}
</style>