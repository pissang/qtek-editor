<template>
<div class="ui-panel">
    <div class="ui-panel-header">
        <span :class="['icon', collapsed ? 'icon-unfold' : 'icon-fold']" @click="toggleCollapsed"></span>
        <slot name="header">
            <h4 title="{{ title }}">{{ title }}</h4>
        </slot>
    </div>
    <div :class="['ui-panel-body', collapsed ? 'collapsed' : '']" v-show="!collapsed">
        <slot name="body"></slot>
        <!-- Default slot -->
        <slot></slot>
    </div>
</div>
</template>

<script>
export default {

    name: 'panel',

    props: {
        title: {
            type: String,
            default: 'Title'
        }
    },

    data () {
        return {
            collapsed: false
        }
    },

    methods: {
        toggleCollapsed () {
            this.collapsed = !this.collapsed;
        }
    }
};
</script>