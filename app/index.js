import App from './App.vue';
import store from './store';
import Vue from 'vue';

new Vue({
    el: 'body',
    data: store,
    components: {
        app: App
    }
});