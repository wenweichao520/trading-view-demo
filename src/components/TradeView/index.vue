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
                symbol: 'BTC-USD',
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

            axios.get("/api/swap/v3/instruments/" + this.symbol + "-SWAP/candles", {
                params: {
                    granularity: `${this.toSecond(this.interval)}`
                }
            }).then((res) => {

                const data = res.data

                this.initData = data

                this.socket.doOpen()
                this.socket.on('open', () => {
                    this.socket.send({"op": "subscribe", "args": this.getArgs(5)})
                })
                this.socket.on('message', this.onMessage)

            })
        },
        methods: {
            init() {

                if (!this.widget) {
                    this.widget = new TvWidget({
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
                        })

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

                    console.log(list)

                    console.log(this.cacheData)

                    this.lastTime = list[list.length - 1].time
                    this.subscribe()
                }
            },
            getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
                // console.log(' >> :', rangeStartDate, rangeEndDate)
                if (this.interval !== resolution) {
                    this.unSubscribe(this.interval)
                    this.interval = resolution
                    this.sendMessage({
                        op: 'subscribe',
                        args: this.getArgs()
                    })
                }

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
