<template>
<div id="app">
    <div class="left">
        <scene></scene>
    </div>
    <div class="center">
        <view></view>
    </div>
    <div class="right">
        <inspector></inspector>
    </div>
</div>
</template>

<script>
import View from './module/view/View.vue';
import Inspector from './module/inspector/Inspector.vue';
import Scene from './module/scene/Scene.vue';

export default {

    name: 'App',

    components: {
        'view': View,
        'inspector': Inspector,
        'scene': Scene
    }
};
</script>

<style lang="sass" src="./style/app.scss"></style>