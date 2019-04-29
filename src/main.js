import Vue from 'vue'
import App from './App'
import VueRouter from 'vue-router'

Vue.config.productionTip = false

Vue.use(VueRouter)

/* eslint-disable no-new */
new Vue({
    router: new VueRouter({
        routes: [
            {
                path: '/',
                component: (resolve) => require(['@/views/Index.vue'], resolve)
            }
        ]
    }),
    render: h => h(App)
}).$mount('#app')
