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
                http: axios,
                datafeeds: new datafeeds(this),
                socket: new socket(),
                symbol: "BTC-USDT",
                interval: 1,
                httpData: {},
                widget: null,
                getBarTimer: null,
                isInit: false
            }
        },
        async created() {
            this.initAxios()
            this.socket.doOpen()
            this.socket.on('message', this.onMessage)
            this.httpData[this.ticker] = await this.getData()
            this.initWidget()
        },
        methods: {

            /**
             * 初始化axios
             */
            initAxios() {
                this.http.defaults.baseURL = 'https://bird.ioliu.cn/v2'
            },

            /**
             * 初始化图表
             */
            initWidget() {
                this.widget = new TvWidget({
                    debug: true,
                    symbol: this.symbol,
                    interval: this.interval,

                    width: 1180,
                    height: 600,

                    container_id: 'trade-view',
                    datafeed: this.datafeeds,
                    library_path: './static/tradeview/charting_library/',

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
            },

            getData() {
                return new Promise((resolve, reject) => {
                    //解决跨域问题
                    this.http.get('https://bird.ioliu.cn/v2', {
                        params: {
                            url: this.url
                        }
                    }).then((res) => {
                        const data = res.data.data
                        const list = []
                        data.forEach((element) => {
                            list.push({
                                time: parseInt(moment(element[0]).format('x')),
                                open: element[1],
                                high: element[2],
                                low: element[3],
                                close: element[4],
                                volume: element[5]
                            })
                        })
                        resolve(list)
                    }).catch((err) => {
                        reject(err)
                    })
                })
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
                    "op": "unsubscribe",
                    "args": this.getArgs(interval)
                })
            },
            subscribe() {
                this.sendMessage({
                    "op": "subscribe",
                    "args": this.getArgs()
                })
            },
            onMessage(data) {
                //socket获取数据后追加到http数据的数组中
                if (data.data && data.data.length > 0) {
                    const _data = data.data[data.data.length - 1]
                    this.datafeeds.barsUpdater.updateData()
                    const barsData = {
                        time: parseInt(moment(_data.candle[0]).format('x')),
                        open: _data.candle[1],
                        high: _data.candle[2],
                        low: _data.candle[3],
                        close: _data.candle[4],
                        volume: _data.candle[5]
                    }

                    if (this.httpData[this.ticker] && this.httpData[this.ticker].length) {
                        const dataLen = this.httpData[this.ticker].length
                        const lastBar = this.httpData[this.ticker][dataLen - 1]
                        if (barsData.time >= lastBar.time) {
                            this.httpData[this.ticker][dataLen - 1] = barsData
                        }
                    }
                }
            },

            getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
                // console.log(this.httpData[this.ticker])
                // console.log(' >> :', rangeStartDate, rangeEndDate)
                if (this.interval !== resolution) {
                    this.unSubscribe(this.interval)
                }

                //赋值时间粒度
                this.interval = resolution

                //http获取数据之后，订阅socket
                this.subscribe()

                if (this.httpData[this.ticker] && this.httpData[this.ticker].length) {
                    const newBars = []
                    this.httpData[this.ticker].forEach(item => {
                        if (item.time >= rangeStartDate * 1000 && item.time <= rangeEndDate * 1000) {
                            newBars.push(item)
                        }
                    })
                    onLoadedCallback(newBars)
                } else {
                    const self = this
                    this.getBarTimer = setTimeout(() => {
                        self.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback)
                    }, 10)
                }
            },

            getArgs(interval) {
                // const symbol = this.symbol.replace(/USDT/g, 'USD')
                const symbol = this.symbol
                interval = interval ? interval : this.interval
                return [`spot/candle${this.toSecond(interval)}s:${symbol}`]
            },

            /**
             * 秒转化
             */
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
                    'pricescale': 100,
                    'ticker': 'BTC-USD',
                    'supported_resolutions': ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W']
                }
            }
        },
        computed: {
            ticker() {
                return `${this.symbol}-${this.interval}`
            },
            url() {
                const params = {
                    granularity: `${this.toSecond(this.interval)}`,
                    size: 1000
                }
                let paramStr = []
                let baseUrl = `https://www.okex.me/v2/spot/instruments/${this.symbol}/candles`
                for(let i in params){
                    paramStr.push(`${i}=${params[i]}`)
                }
                paramStr = paramStr.join('&')
                baseUrl += `?${paramStr}`
                return baseUrl
            }
        },
        watch: {
            async interval() {
                this.httpData[this.ticker] = await this.getData()
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
