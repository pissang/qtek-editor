<template>
<div id="app">
    <div class="left">
        <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active">
                <a data-toggle="tab" href="#scene">Scene</a>
            </li>
            <li role="presentation">
                <a data-toggle="tab" href="#render">Render</a>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane active" role="tabpanel" id="scene">
                <scene></scene>
            </div>
            <div class="tab-pane" role="tabpanel" id="render">
                <render></render>
            </div>
        </div>
    </div>
    <div class="center">
        <div class="top">
            <view></view>
        </div>
        <div class="bottom">
        </div>
    </div>
    <div class="right" id="inspector">
        <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active">
                <a data-toggle="tab" href="#inspector">Material</a>
            </li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane active" role="tabpanel" id="inspector">
                <component :is="inspectorType"></component>
            </div>
        </div>
    </div>
</div>
</template>

<script>
import View from './module/view/View.vue';
import Render from './module/render/Render.vue';
import Scene from './module/scene/Scene.vue';
import Entity from './module/entity/Entity.vue';
import Material from './module/material/Material.vue';
import Light from './module/light/Light.vue';
import eventBus from '../common/eventBus';

import store from './store';

export default {

    name: 'App',

    data () {
        return store;
    },

    components: {
        'view': View,
        'material': Material,
        'render': Render,
        'scene': Scene,
        'entity': Entity,
        'light': Light
    },

    ready () {
        $(window).resize(function () {
            eventBus.$emit('resize');
        });
    }
};
</script>