<template>
<div id="app">
    <div class="left">
        <scene></scene>
        <render></render>
    </div>
    <div class="center">
        <div class="top">
            <view></view>
        </div>
        <div class="bottom">
        </div>
    </div>
    <div class="right">
        <inspector></inspector>
    </div>
</div>
</template>

<script>
import View from './module/view/View.vue';
import Inspector from './module/inspector/Inspector.vue';
import Render from './module/render/Render.vue';
import Scene from './module/scene/Scene.vue';

export default {

    name: 'App',

    components: {
        'view': View,
        'inspector': Inspector,
        'render': Render,
        'scene': Scene
    }
};
</script>