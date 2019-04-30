(function (callback) {

    var app = {

        datafeeds: null,

        httpData: {},

        widget: null,

        activeChart: null,

        getBarTimer: null,

        get interval() {
            if (!this.activeChart) return 1;
            return this.activeChart.resolution();
        },

        get symbol() {
            if (!this.activeChart) return "BTC-USDT";
            return this.activeChart.symbol();
        },

        /**
         * 初始化
         */
        init: function () {
            this.initWeight();
        },

        /**
         * 初始化数据
         */
        initData: function () {
            this.http.getData(function (data) {
                app.httpData[app.ticker] = data;
            });
        },

        /**
         * 初始化widght
         * @param callback
         */
        initWeight: function () {

            this.initData();

            this.datafeeds = datafeesClass(app._datafeeds);

            this.widget = new TradingView.widget(this.options);

            //图表加载完成事件
            this.widget.onChartReady(function () {

                var widget = this.activeChart();

                app.activeChart = widget;

                //开启socket
                app._socket.init();

                //初始化头部按钮
                app.headerBar.init();
            });

        },

        /**
         * 秒转化
         */
        toSecond(minute) {
            minute = minute.toString();
            //日转化
            if (minute.indexOf('D') !== -1) {
                var day = minute.toString().split('D')[0];
                return parseInt(day) * 24 * 60 * 60;
            }
            //周转化
            if (minute.indexOf('W') !== -1) {
                var week = minute.toString().split('W')[0];
                return parseInt(week) * 7 * 24 * 60 * 60;
            }
            return parseInt(minute) * 60;
        },

        /**
         * 设置时间
         * @param interval
         */
        setInterval(interval) {
            this._socket.unSubscribe();//取消订阅
            this.activeChart.setResolution(interval);
            this.initData();
            this._socket.subscribe();//重新订阅
        },

        /**
         * 设置商品
         * @param symbol
         */
        setSymbol(symbol) {
            this._socket.unSubscribe();//取消订阅
            this.activeChart.setSymbol(symbol);
            this.initData();
            this._socket.subscribe();//重新订阅
        },

        /**
         * 获取ticker
         * @returns {string}
         */
        get ticker() {
            return this.symbol + "-" + this.interval;
        },

        /**
         * 获取widght配置
         */
        get options() {
            return {
                // debug: true,
                symbol: this.symbol,
                interval: this.interval,
                user_id: "public_user_id",
                fullscreen: false,
                autosize: true,
                container_id: 'trade-view',
                datafeed: this.datafeeds,
                custom_css_url: '../../../tradeview/assets/css/custom.css',
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

        /**
         * socket方法
         */
        _socket: {

            self: socketClass(),

            init: function () {
                this.self.doOpen();
                this.self.on('message', this.onMessage);
                this.subscribe();
            },

            sendMessage(data) {
                var _this = this;
                if (this.self.checkOpen()) {
                    this.self.send(data)
                } else {
                    this.self.on('open', function () {
                        _this.self.send(data)
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
                    var _data = data.data[data.data.length - 1];

                    app.datafeeds.barsUpdater.updateData();

                    var barsData = {
                        time: parseInt(moment(_data.candle[0]).format('x')),
                        open: parseFloat(_data.candle[1]),
                        high: parseFloat(_data.candle[2]),
                        low: parseFloat(_data.candle[3]),
                        close: parseFloat(_data.candle[4]),
                        volume: parseFloat(_data.candle[5])
                    };

                    if (typeof app.httpData[app.ticker] == 'object') {
                        app.httpData[app.ticker].push(barsData);
                    }
                }
            },

            /**
             * 获取socket调用参数
             * @param interval
             * @returns {string[]}
             */
            get args() {
                return ["spot/candle" + app.toSecond(app.interval) + "s:" + app.symbol]
            }

        },

        /**
         * datafeed方法
         */
        _datafeeds: {

            /**
             * 默认配置
             */
            getConfig: function () {
                return {
                    supports_search: true,
                    supports_group_request: false,
                    supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W'],
                    supports_marks: true,
                    supports_timescale_marks: true,
                    supports_time: true
                };
            },

            /**
             * 默认商品信息
             */
            getSymbol: function () {
                return {
                    exchange: "BTCS",
                    symbol: app.symbol,
                    description: app.symbol,
                    timezone: 'Asia/Shanghai',
                    minmov: 1,
                    minmov2: 0,
                    pointvalue: 1,
                    fractional: false,
                    session: '24x7',
                    has_intraday: true,
                    has_no_volume: false,
                    pricescale: 1e4,
                    ticker: app.symbol,
                    supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W'],
                    volume_precision: 8,
                };
            },

            /**
             * 数据块处理
             * @param symbolInfo
             * @param resolution
             * @param rangeStartDate
             * @param rangeEndDate
             * @param onLoadedCallback
             */
            getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
                var ticker = app.ticker;
                if (app.httpData[ticker] && app.httpData[ticker].length) {
                    var newBars = [];
                    var data = app.httpData[ticker];
                    for (var i in data) {
                        if (data[i].time >= rangeStartDate * 1000 && data[i].time <= rangeEndDate * 1000) {
                            newBars.push(data[i]);
                        }
                    }
                    onLoadedCallback(newBars);
                } else {
                    var self = this;
                    app.getBarTimer = setTimeout(function () {
                        self.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback);
                    }, 10);
                }
            }

        },

        /**
         * 头部工具栏方法
         */
        headerBar: {

            init: function () {
                for (var i in this) {
                    if (i != 'init') this[i]();
                }
            },

            /**
             * 下拉菜单方法
             */
            dropdown: function () {
                $('.dropdown ul li').each(function (k, v) {
                    var value = $(v).data('value');
                    var symbol = value.replace(/\//g, '-');
                    if (symbol == app.symbol) {
                        $(v).addClass('selected');
                        $('.coin-list').find('.title').text(value);
                    }

                    $(v).click(function () {
                        var value = $(this).data('value');
                        var symbol = value.replace(/\//g, '-');
                        $(this).addClass('selected').siblings('li').removeClass('selected');
                        $('.coin-list').find('.title').text(value);
                        app.setSymbol(symbol);
                    });
                });
                $('.coin-list').mouseover(function () {
                    $(this).find('.dropdown').removeClass('hide');
                    $(this).find('.arrow span').css({
                        "transition-duration": "0.5s",
                        "transform": "rotate(180deg)"
                    });
                }).mouseout(function () {
                    $(this).find('.dropdown').addClass('hide');
                    $(this).find('.arrow span').css({
                        "transition-duration": "0.5s",
                        "transform": "rotate(0deg)"
                    });
                });
            },

            /**
             * 时间筛选
             */
            periods: function () {
                $('.k-toolbar-wrap').find('.collect ul').children('li').each(function (k, v) {

                    var li = $(v);
                    var value = li.data('value');

                    li.removeClass('true');

                    if (value == app.interval) {
                        li.removeClass('true').addClass('selected');
                    } else {
                        li.removeClass('selected').addClass('true');
                    }

                    li.stop().click(function () {
                        var interval = $(this).data('value').toString();
                        if (interval != app.interval) {
                            $(this).addClass('selected').siblings('li').removeClass('selected').addClass('true');
                            app.setInterval(interval);
                        }
                    });
                });
            },

            /**
             * 技术指标
             */
            indicator: function () {
                $('.k-toolbar .technical-indicator').click(function () {
                    app.activeChart.executeActionById('insertIndicator');
                });
            },

            /**
             * 截图
             */
            screenshot: function () {
                $('.k-toolbar .screenshot').click(function () {
                    app.widget.takeScreenshot();
                });
            },

            /**
             * 设置
             */
            setting: function () {
                $('.k-toolbar .setting').click(function () {
                    app.activeChart.executeActionById('chartProperties');
                });
            },

            /**
             * 全屏
             */
            fullscreen: function () {
                $('.k-toolbar .fullscreen').click(function () {
                    var i = $(this).find('.iconfont');
                    var li = $(this).children('li');
                    if (i.hasClass('icon-fullscreen2')) {
                        //计算高度
                        var height = $(window).height() - $('.k-toolbar-wrap').height();
                        $('.trading-view-main').attr({
                            style: 'height: ' + height + 'px'
                        });

                        li.attr('title', '退出全屏');
                        i.removeClass('icon-fullscreen2').addClass('icon-exitfullscreen1');
                    } else {
                        $('.trading-view-main').removeAttr('style');
                        li.attr('title', '全屏');
                        i.removeClass('icon-exitfullscreen1').addClass('icon-fullscreen2');
                    }
                    $('.trading-view-container').toggleClass('fullscreen');
                });
            }

        },

        /**
         * http操作方法
         */
        http: {

            getUrl: function () {
                var params = {
                    granularity: app.toSecond(app.interval),
                    size: 1000
                };
                var paramStr = [];
                var baseUrl = "https://www.okex.me/v2/spot/instruments/" + app.symbol + "/candles";
                for (var i in params) {
                    paramStr.push(i + "=" + params[i]);
                }
                paramStr = paramStr.join('&');
                baseUrl += "?" + paramStr;
                return baseUrl;
            },

            getData: function (callback) {
                var baseUrl = this.getUrl();
                $.ajax({
                    url: 'https://bird.ioliu.cn/v2',
                    data: {
                        url: baseUrl
                    },
                    dataType: 'JSON',
                    type: 'GET',
                    success: function (res) {
                        var _data = res.data;
                        var data = [];
                        for (var i in _data) {
                            data.push({
                                time: parseInt(moment(_data[i][0]).format('x')),
                                open: parseFloat(_data[i][1]),
                                high: parseFloat(_data[i][2]),
                                low: parseFloat(_data[i][3]),
                                close: parseFloat(_data[i][4]),
                                volume: parseFloat(_data[i][5])
                            })
                        }
                        callback(data);
                    }
                });
            }
        }

    };

    return callback(app);
    
})(function(app){
    $(function () {
        app.init();
    });
});
