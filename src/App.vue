<template>
    <div id="app">
        <app-main></app-main>
    </div>
</template>

<script>
    import AppMain from './components/Main'

    export default {
        name: 'App',
        components: {
            AppMain: AppMain
        }
    }
</script>
