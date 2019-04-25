// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'

const NotFound = {template: '<p>Page not found</p>'}
const Home = (resolve) => require(['@/components/TradeView/Index.vue'], resolve)
const Udf = (resolve) => require(['@/components/TradeView/Udf.vue'], resolve)

const routes = {
    '/': Home,
    '/udf': Udf
}

Vue.config.productionTip = false

/* eslint-disable no-new */
new Vue({
    el: '#app',
    data: {
        currentRoute: window.location.pathname
    },
    components: {App},
    computed: {
        ViewComponent() {
            return routes[this.currentRoute] || NotFound
        }
    },
    render(h) {
        return h(this.ViewComponent)
    }
})
