
import VueI18n from 'vue-i18n';
import Vue from 'vue';
Vue.use(VueI18n);
Vue.config.lang = 'cn';
Vue.config.fallbackLang = 'en';

Vue.locale('cn', require('./locale/cn'));
Vue.locale('en', require('./locale/en'));

import App from './App.vue';
import store from './store';

new Vue({
    el: 'body',
    data: store,
    components: {
        app: App
    }
});