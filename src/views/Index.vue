<template>
    <div>
        <h1>全屏参照，不必理会</h1>

        <div class="trading-view-container" :class="headerBar.isFullscreen ? 'fullscreen' : ''">
            <div class="k-toolbar-wrap" ref="toolbar">
                <div class="k-toolbar dark">

                    <div class="coin-list" @mouseover="onArrowMouseover" @mouseout="onArrowMouseout">
                        <div class="dropdown" :class="coinListCfg.isDropdown ? '' : 'hide'">
                            <ul>
                                <li v-for="item in coinList"
                                    :class="item.replace(/\//g, '-') == symbol ? 'selected' : ''"
                                    @click="onClickSymbol(item)"><span>{{item}}</span>
                                </li>
                            </ul>
                        </div>
                        <div class="title">{{symbol.replace(/\-/g, '/')}}</div>
                        <li class="arrow">
                            <span
                                :style="coinListCfg.isDropdown ? {'transition-duration': '0.5s', 'transform': 'rotate(180deg)'} : {'transition-duration': '0.5s', 'transform': 'rotate(0deg)'}">
                                <i class="iconfont icon-kline-down"></i>
                            </span>
                        </li>
                    </div>

                    <div class="border-line"></div>

                    <div class="periods">
                        <div class="collect">
                            <ul>
                                <li v-for="item in intervalData" :key="item.value"
                                    @click="onHeaderInterval(item.value)"
                                    :class="interval == item.value ? 'selected' : 'true'">
                                    <span>{{item.name}}</span>
                                </li>
                            </ul>
                        </div>
                        <div class="border-line"></div>
                    </div>
                    <div class="technical-indicator icon-button" @click="onHeaderIndicator">
                        <li title="技术指标"><i class="iconfont icon-zhibiaozhuanqu"></i></li>
                    </div>
                    <div class="screenshot icon-button" @click="onHeaderScreenshot">
                        <li title="屏幕快照"><i class="iconfont icon-Icon-Photo"></i></li>
                    </div>
                    <div class="setting icon-button" @click="onHeaderSetting">
                        <li title="设置"><i class="iconfont icon-menu-administration"></i></li>
                    </div>
                    <div class="fullscreen icon-button" @click="onHeaderFullscreen">
                        <li class="" :title="headerBar.fullscreenText">
                            <i class="iconfont" :class="headerBar.fullscreenClass"></i>
                        </li>
                    </div>
                </div>
            </div>
            <div id="trade-view" class="trading-view-main"
                 :style="headerBar.isFullscreen ? {height: viewHeight + 'px'} : {}"></div>
        </div>

        <h1>全屏参照，不必理会</h1>
    </div>
</template>

<script>
    import {widget as TvWidget} from '@/../static/tradeview/charting_library/charting_library.min.js'
    import socket from '../utils/datafeeds/socket.js'
    import datafeeds from '../utils/datafeeds/datafees.js'
    import moment from 'moment'
    import axios from 'axios'

    export default {
        data() {
            return {
                datafeeds: new datafeeds(this),
                socket: new socket(),
                httpData: {},
                widget: null,
                getBarTimer: null,
                activeChart: null,
                viewHeight: 0,
                headerBar: {
                    isFullscreen: false,
                    fullscreenText: '全屏',
                    fullscreenClass: 'icon-fullscreen2'
                },
                coinListCfg: {
                    isDropdown: false
                },
                coinList: [
                    "BTC/USDT",
                    "LTC/USDT",
                    "ETH/USDT",
                    "BCH/USDT",
                    "EOS/USDT",
                    "BSV/USDT"
                ],
                intervalData: [
                    {
                        value: '1', name: '1分钟'
                    },
                    {
                        value: '3', name: '3分钟'
                    },
                    {
                        value: '5', name: '5分钟'
                    },
                    {
                        value: '15', name: '15分钟'
                    },
                    {
                        value: '30', name: '30分钟'
                    },
                    {
                        value: '60', name: '1小时'
                    },
                    {
                        value: '120', name: '2小时'
                    },
                    {
                        value: '240', name: '4小时'
                    },
                    {
                        value: '360', name: '6小时'
                    },
                    {
                        value: '720', name: '12小时'
                    },
                    {
                        value: '1D', name: '1日'
                    },
                    {
                        value: '1W', name: '1周'
                    }
                ]
            }
        },
        mounted() {
            this.initWidget()
        },
        methods: {

            async initData() {
                const data = await this.getData()
                this.httpData[this.ticker] = data
                this.initSocket()//开启订阅K线
            },

            initSocket() {
                this.socket.doOpen()
                this.socket.on('message', this.onMessage)
                this.subscribe()
            },

            /**
             * 初始化图表
             */
            initWidget() {
                this.initData()
                this.widget = new TvWidget(this.options)
                //图表加载完成事件
                this.widget.onChartReady(() => {
                    const widget = this.widget.activeChart()
                    this.activeChart = widget//初始化头部按钮
                })
            },

            onArrowMouseover() {
                this.coinListCfg.isDropdown = true
            },

            onArrowMouseout() {
                this.coinListCfg.isDropdown = false
            },

            onClickSymbol(symbol) {
                symbol = symbol.replace(/\//g, '-')
                if(symbol != this.symbol){
                    this.unSubscribe()
                    this.activeChart.setSymbol(symbol)
                    this.initData()
                }
            },

            /**
             * 更改interval
             */
            onHeaderInterval(interval) {
                if (interval != this.interval) {
                    this.unSubscribe()
                    this.activeChart.setResolution(interval)
                    this.initData()
                }
            },

            /**
             * 技术指标
             */
            onHeaderIndicator() {
                this.activeChart.executeActionById('insertIndicator')
            },

            /**
             * 截图
             */
            onHeaderScreenshot() {
                this.widget.takeScreenshot()
            },

            /**
             * 设置
             */
            onHeaderSetting() {
                this.activeChart.executeActionById('chartProperties')
            },

            /**
             * 全屏
             */
            onHeaderFullscreen() {
                this.viewHeight = window.innerHeight - this.$refs.toolbar.clientHeight
                if (!this.headerBar.isFullscreen) {
                    this.headerBar.fullscreenText = '退出全屏'
                    this.headerBar.fullscreenClass = 'icon-exitfullscreen1'
                } else {
                    this.headerBar.fullscreenText = '全屏'
                    this.headerBar.fullscreenClass = 'icon-fullscreen2'
                }
                this.headerBar.isFullscreen = !this.headerBar.isFullscreen
            },

            getData() {
                return new Promise((resolve, reject) => {
                    //解决跨域问题
                    axios.get('https://bird.ioliu.cn/v2', {
                        params: {
                            url: this.url
                        }
                    }).then((res) => {
                        const data = res.data.data
                        const list = []
                        data.forEach((element) => {
                            list.push({
                                time: parseInt(moment(element[0]).format('x')),
                                open: parseFloat(element[1]),
                                high: parseFloat(element[2]),
                                low: parseFloat(element[3]),
                                close: parseFloat(element[4]),
                                volume: parseFloat(element[5])
                            })
                        })
                        resolve(list)
                    }).catch((err) => {
                        reject(err)
                    })
                })
            },

            sendMessage(data) {
                const self = this
                if (this.socket.checkOpen()) {
                    this.socket.send(data)
                } else {
                    this.socket.on('open', () => {
                        self.socket.send(data)
                    })
                }
            },
            unSubscribe() {
                this.sendMessage({
                    "op": "unsubscribe",
                    "args": this.args
                })
            },
            subscribe() {
                this.sendMessage({
                    "op": "subscribe",
                    "args": this.args
                })
            },
            onMessage(data) {
                //socket获取数据后追加到http数据的数组中
                if (data.data && data.data.length > 0) {
                    const _data = data.data[data.data.length - 1]
                    this.datafeeds.barsUpdater.updateData()
                    const barsData = {
                        time: parseInt(moment(_data.candle[0]).format('x')),
                        open: parseFloat(_data.candle[1]),
                        high: parseFloat(_data.candle[2]),
                        low: parseFloat(_data.candle[3]),
                        close: parseFloat(_data.candle[4]),
                        volume: parseFloat(_data.candle[5])
                    }
                    if (typeof this.httpData[this.ticker] == 'object') {
                        this.httpData[this.ticker].push(barsData)
                    }
                }
            },

            getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
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
                    exchange: "BTCS",
                    symbol: this.symbol,
                    description: this.symbol,
                    timezone: 'Asia/Shanghai',
                    minmov: 1,
                    minmov2: 0,
                    pointvalue: 1,
                    fractional: false,
                    session: '24x7',
                    has_intraday: true,
                    has_no_volume: false,
                    pricescale: 1e4,
                    ticker: this.symbol,
                    supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W'],
                    volume_precision: 8
                }
            }
        },
        computed: {
            options() {
                return {
                    // debug: true,
                    symbol: this.symbol,
                    interval: this.interval,
                    user_id: "public_user_id",
                    fullscreen: false,
                    autosize: true,
                    container_id: 'trade-view',
                    datafeed: this.datafeeds,
                    custom_css_url: '../../assets/css/custom.css',
                    library_path: '../../static/tradeview/charting_library/',
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
                        "countdown",
                        "header_widget",
                        "caption_buttons_text_if_possible"
                    ],
                    enabled_features: [
                        "study_templates",
                        "hide_last_na_study_output"
                    ],
                    theme: 'Dark',
                    timezone: 'Asia/Shanghai',
                    locale: 'zh',
                    overrides: {
                        "paneProperties.background": "#121d32",
                    }
                };
            },
            interval() {
                if (!this.activeChart) return 1
                return this.activeChart.resolution()
            },
            symbol() {
                if (!this.activeChart) return "BTC-USDT"
                return this.activeChart.symbol()
            },
            args() {
                return [`spot/candle${this.toSecond(this.interval)}s:${this.symbol}`]
            },
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
                for (let i in params) {
                    paramStr.push(`${i}=${params[i]}`)
                }
                paramStr = paramStr.join('&')
                baseUrl += `?${paramStr}`
                return baseUrl
            }
        }
    }
</script>

<style>
    @import "../../static/tradeview/assets/css/index.css";
</style>
