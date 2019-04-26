(function () {

    var app = {

        datafeeds: null,

        socket: socketClass(),

        symbol: "BTC-USDT",

        interval: 1,

        httpData: {},

        widget: null,

        getBarTimer: null,

        init: function () {
            this.httpData[this.getTicker()] = [];
            this.initWeight();
            this.initData();
        },

        initData: function () {
            this.getData(function (data) {
                app.httpData[app.getTicker()] = data;
                app.initSocket();
            });
        },

        initSocket: function () {
            app.socket.doOpen();
            app.socket.on('message', app.onMessage);
        },

        initWeight: function () {

            this.datafeeds = datafeesClass(app);

            this.widget = new TradingView.widget({
                // debug: true,
                symbol: this.symbol,
                interval: this.interval,
                user_id: "public_user_id",
                width: 1180,
                height: 600,
                container_id: 'trade-view',
                datafeed: this.datafeeds,
                library_path: '../static/tradeview/charting_library/',
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
                enabled_features: [
                    "study_templates",
                    "hide_last_na_study_output"
                ],
                theme: 'Dark',
                toolbar_bg: "#121d32",
                allow_symbol_change: !0,
                timezone: 'Asia/Shanghai',
                locale: 'zh'
            });

            this.widget.onChartReady(function () {
                var widget = this.activeChart();
                //当时间颗粒变化，则触发改变
                widget.onIntervalChanged().subscribe(null, function (interval, obj) {
                    widget.resetData();
                    app.interval = interval;
                    app.initData();
                });
            });

        },

        sendMessage(data) {
            if (app.socket.checkOpen()) {
                app.socket.send(data)
            } else {
                app.socket.on('open', function () {
                    app.socket.send(data)
                })
            }
        },

        unSubscribe(interval) {
            app.sendMessage({
                "op": "unsubscribe",
                "args": app.getArgs(interval)
            })
        },

        subscribe() {
            app.sendMessage({
                "op": "subscribe",
                "args": app.getArgs()
            })
        },

        onMessage(data) {
            //socket获取数据后追加到http数据的数组中
            if (data.data && data.data.length > 0) {
                var _data = data.data[data.data.length - 1];

                app.datafeeds.barsUpdater.updateData();

                var barsData = {
                    time: parseInt(moment(_data.candle[0]).format('x')),
                    open: _data.candle[1],
                    high: _data.candle[2],
                    low: _data.candle[3],
                    close: _data.candle[4],
                    volume: parseFloat(_data.candle[5])
                }

                var ticker = app.getTicker();

                if (app.httpData[ticker] && app.httpData[ticker].length) {
                    var dataLen = app.httpData[ticker].length
                    var lastBar = app.httpData[ticker][dataLen - 1]
                    if (barsData.time >= lastBar.time) {
                        app.httpData[ticker][dataLen - 1] = barsData;
                    }
                }
            }
        },

        getArgs(interval) {
            const symbol = this.symbol
            interval = interval ? interval : this.interval
            return ["spot/candle" + this.toSecond(interval) + "s:" + symbol]
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

        getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
            if (this.interval !== resolution) this.unSubscribe(this.interval);

            //赋值时间粒度
            this.interval = resolution;

            //http获取数据之后，订阅socket
            this.subscribe();

            var ticker = app.getTicker();

            if (this.httpData[ticker] && this.httpData[ticker].length) {
                var newBars = [];
                var data = this.httpData[ticker];
                for (var i in data) {
                    if (data[i].time >= rangeStartDate * 1000 && data[i].time <= rangeEndDate * 1000) {
                        newBars.push(data[i]);
                    }
                }
                onLoadedCallback(newBars);
            } else {
                this.getBarTimer = setTimeout(function () {
                    app.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback);
                }, 10);
            }
        },

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
                pricescale: 10,
                ticker: app.symbol,
                supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W']
            };
        },

        /**
         * 获取数据
         * @returns {Array}
         */
        getData(callback) {
            $.ajax({
                url: 'https://bird.ioliu.cn/v2',
                data: {
                    url: this.getUrl()
                },
                dataType: 'JSON',
                type: 'GET',
                success: function (res) {
                    var _data = res.data;
                    var data = [];
                    for (var i in _data) {
                        data.push({
                            time: parseInt(moment(_data[i][0]).format('x')),
                            open: _data[i][1],
                            high: _data[i][2],
                            low: _data[i][3],
                            close: _data[i][4],
                            volume: parseFloat(_data[i][5])
                        })
                    }
                    callback(data);
                }
            });
        },

        /**
         * 获取url
         * @returns {string}
         */
        getUrl() {
            var params = {
                granularity: this.toSecond(this.interval),
                size: 1000
            };
            var paramStr = [];
            var baseUrl = "https://www.okex.me/v2/spot/instruments/" + this.symbol + "/candles";
            for (var i in params) {
                paramStr.push(i + "=" + params[i]);
            }
            paramStr = paramStr.join('&');
            baseUrl += "?" + paramStr;
            return baseUrl;
        },

        /**
         * 获取ticker
         * @returns {string}
         */
        getTicker() {
            return this.symbol + "-" + this.interval;
        }

    };

    $(function () {
        app.init();
    });

    return app;
})();
