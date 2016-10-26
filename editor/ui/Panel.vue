<template>
<div class="ui-panel">
    <div class="ui-panel-header" @click="toggleCollapse">
        <span :class="['icon', collapse ? 'icon-unfold' : 'icon-fold']"></span>
        <slot name="header">
            <h4 title="{{ title }}">{{ title }}</h4>
        </slot>
    </div>
    <div :class="['ui-panel-body', collapse ? 'collapse' : '']">
        <slot name="body"></slot>
    </div>
</div>
</template>

<script>
module.exports = {
    props: {
        title: {
            type: String,
            default: 'Title'
        }
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
.ui-panel-header {
    background: #333;
    box-sizing: border-box;
    border-radius: 4px 4px 0 0;
    position: relative;

    h3, h4, h5 {
        font-size: 12px;
        text-transform: uppercase;
        color: #ddd;
        margin: 0;
        padding: 6px 6px;

        // TODO
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    h4 {
        font-size: 14px;
    }
    h3 {
        font-size: 16px;
    }

    &>.icon {
        color: #ea4d4d;
        cursor: pointer;
        margin-left: 3px;
    }

    &>* {
        display: inline-block;
        vertical-align: middle;
    }
}
.ui-panel-body {
    padding: 5px 4px;

    &.collapse {
        height: 0;
        overflow: hidden;
        padding: 0;
    }
}
</style>