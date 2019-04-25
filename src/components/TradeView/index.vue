<template>
    <div id="trade-view">
    </div>
</template>

<script>
    import {widget as TvWidget} from '@/../static/tradeview/charting_library/charting_library.min.js'
    import socket from './datafeeds/socket.js'
    import datafeeds from './datafeeds/datafees.js'
    import moment from 'moment'
    import axios from 'axios'

    export default {
        data() {
            return {
                widget: null,
                socket: new socket(),
                datafeeds: new datafeeds(this),
                symbol: 'BTC-USDT',
                interval: 5,
                initData: {},
                cacheData: {},
                lastTime: null,
                getBarTimer: null,
                isLoading: true
            }
        },
        created() {

            axios.defaults.baseURL = '/okex'

            axios.get(`/v2/spot/instruments/${this.symbol}/candles`, {
                params: {
                    granularity: `${this.toSecond(this.interval)}`,
                    size: 1000
                }
            }).then((res) => {

                const data = res.data.data

                console.log(data)

                const list = []
                const ticker = `${this.symbol}-${this.interval}`

                data.forEach(function (element) {
                    list.push({
                        time: parseInt(moment(element[0]).format('x')),
                        open: element[1],
                        high: element[2],
                        low: element[3],
                        close: element[4],
                        volume: element[5]
                    })
                }, this)

                console.log(list)

                this.cacheData[ticker] = list

                // this.lastTime = list[list.length - 1].time

                // this.socket.doOpen()
                // this.socket.on('open', () => {
                //     this.socket.send({"op": "subscribe", "args": this.getArgs(this.interval)})
                // })
                // this.socket.on('message', this.onMessage)

            })
        },
        mounted(){
            this.init()
        },
        methods: {
            init() {

                if (!this.widget) {
                    this.widget = new TvWidget({
                        // debug: true,
                        symbol: this.symbol,
                        interval: this.interval,

                        width: 1180,
                        height: 600,

                        container_id: 'trade-view',
                        datafeed: this.datafeeds,
                        library_path: '/static/tradeview/charting_library/',

                        disabled_features: [
                            "save_chart_properties_to_local_storage",
                            "volume_force_overlay",
                            "header_saveload",
                            "header_symbol_search",
                            "header_chart_type",
                            "header_compare",
                            "header_undo_redo",
                            "header_indicators",
                            "timeframes_toolbar",
                            "countdown"
                        ],
                        enabled_features: ["study_templates"],

                        theme: 'Dark',
                        toolbar_bg: "#121d32",

                        timezone: 'Asia/Shanghai',
                        locale: 'zh'

                    })
                }

            },
            sendMessage(data) {
                if (this.socket.checkOpen()) {
                    this.socket.send(data)
                } else {
                    this.socket.on('open', () => {
                        this.socket.send(data)
                    })
                }
            },
            unSubscribe(interval) {
                this.sendMessage({
                    op: 'unsubscribe',
                    args: this.getArgs(interval)
                })
            },
            subscribe() {
                this.sendMessage({
                    op: 'subscribe',
                    args: this.getArgs()
                })
            },
            onMessage(data) {

                console.log(data)

                if (data.data && data.data.length) {

                    const list = []
                    const ticker = `${this.symbol}-${this.interval}`

                    if(this.initData !== null){

                        this.initData.forEach(function (element) {
                            list.push({
                                time: parseInt(moment(element[0]).format('x')),
                                open: element[1],
                                high: element[2],
                                low: element[3],
                                close: element[4],
                                volume: element[5]
                            })
                        }, this)

                        this.initData = null
                    }

                    data.data.forEach(function (element) {
                        list.push({
                            time: parseInt(moment(element.candle[0]).format('x')),
                            open: element.candle[1],
                            high: element.candle[2],
                            low: element.candle[3],
                            close: element.candle[4],
                            volume: element.candle[5]
                        })
                    }, this)

                    this.cacheData[ticker] = list

                    this.lastTime = list[list.length - 1].time
                    this.subscribe()
                }
            },
            getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {

                // console.log(symbolInfo)

                // console.log(' >> :', rangeStartDate, rangeEndDate)

                // console.log(resolution)
                // console.log('*******************')
                // console.log(moment(rangeStartDate * 1000).format() + ' ~ ' + moment(rangeEndDate * 1000).format())
                // console.log('*******************')

                // if (this.interval !== resolution) {
                //     this.unSubscribe(this.interval)
                //     this.interval = resolution
                //     this.sendMessage({
                //         op: 'subscribe',
                //         args: this.getArgs()
                //     })
                // }

                const ticker = `${this.symbol}-${this.interval}`
                if (this.cacheData[ticker] && this.cacheData[ticker].length) {
                    this.isLoading = false
                    const newBars = []
                    this.cacheData[ticker].forEach(item => {
                        if (item.time >= rangeStartDate * 1000 && item.time <= rangeEndDate * 1000) {
                            newBars.push(item)
                        }
                    })
                    onLoadedCallback(newBars)
                } else {
                    const self = this
                    this.getBarTimer = setTimeout(function () {
                        self.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback)
                    }, 10)
                }
            },
            getArgs(interval) {
                interval = interval ? interval : this.interval
                return [`index/candle${this.toSecond(interval)}s:${this.symbol}`]
            },
            toSecond(minute) {
                minute = minute.toString()
                //日转化
                if (minute.indexOf('D') !== -1) {
                    let day = minute.toString().split('D')[0]
                    return parseInt(day) * 24 * 60 * 60
                }
                //周转化
                if (minute.indexOf('W') !== -1) {
                    let week = minute.toString().split('W')[0]
                    return parseInt(week) * 7 * 24 * 60 * 60
                }
                return parseInt(minute) * 60
            },

            /**
             * 默认配置
             */
            getConfig() {
                return {
                    supports_search: true,
                    supports_group_request: false,
                    supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W'],
                    supports_marks: true,
                    supports_timescale_marks: true,
                    supports_time: true
                }
            },

            /**
             * 默认商品信息
             */
            getSymbol() {
                return {
                    'name': 'BTC-USD',
                    'timezone': 'Asia/Shanghai',
                    'minmov': 1,
                    'minmov2': 0,
                    'pointvalue': 1,
                    'fractional': false,
                    'session': '24x7',
                    'has_intraday': true,
                    'has_no_volume': false,
                    'description': 'BTC-USD',
                    'pricescale': 1,
                    'ticker': 'BTC-USD',
                    'supported_resolutions': ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W']
                }
            }
        }
    }
</script>

<style scoped>
    #trade-view {
        width: 1180px;
        margin: 10px auto;
    }
</style>
