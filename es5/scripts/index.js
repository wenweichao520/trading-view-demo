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
            this.initWeight();
            this.initData();
        },

        initData: function () {
            this.getData(function (data) {
                app.httpData[app.getTicker()] = data;
            });
        },

        initSocket: function () {
            app.socket.doOpen();
            app.socket.on('message', app.onMessage);
            this.subscribe();
        },

        initWeight: function () {
            this.datafeeds = datafeesClass(app);
            this.widget = new TradingView.widget(this.getWidgetConfig());
            //图表加载完成事件
            this.widget.onChartReady(function () {

                var widget = this.activeChart();

                //开启订阅K线
                app.initSocket();

                /*widget.onIntervalChanged().subscribe(null, function(interval, obj) {
                    widget.resetData();
                    app.interval = interval;
                    app.initData();
                })*/

                //初始化头部按钮
                app.initHeaderBar(widget);
            });
        },

        /**
         * 初始化头部工具栏
         */
        initHeaderBar: function (widget) {

            //选择时间粒度
            $('.k-toolbar-wrap').find('.collect ul').children('li').each(function (k, v) {

                var li = $(v);
                var value = li.data('value');

                li.removeClass('true');

                if (value == app.interval) {
                    li.removeClass('true').addClass('selected');
                } else {
                    li.removeClass('selected').addClass('true');
                }

                li.click(function () {
                    var interval = $(this).data('value').toString();
                    if(interval != app.interval){
                        $(this).addClass('selected').siblings('li').removeClass('selected').addClass('true');
                        app.interval = interval;
                        app.initData();
                        widget.setResolution(interval);
                    }
                });
            });

            //技术指标
            $('.k-toolbar .technical-indicator').click(function(){
                console.log(app.widget)
                console.log(widget)
                widget.executeActionById('insertIndicator');
            });

            //截图
            $('.k-toolbar .screenshot').click(function(){
                app.widget.takeScreenshot();
            });

            //设置
            $('.k-toolbar .setting').click(function(){
                widget.executeActionById('chartProperties');
            });

            //全屏
            $('.k-toolbar .fullscreen').click(function(){
                var i = $(this).find('.iconfont');
                var li = $(this).children('li');
                if(i.hasClass('icon-fullscreen2')){

                    //计算高度
                    var height = $(window).height() - $('.k-toolbar-wrap').height();
                    $('.trading-view-main').attr({
                        style: 'height: ' + height + 'px'
                    });

                    li.attr('title', '退出全屏');
                    i.removeClass('icon-fullscreen2').addClass('icon-exitfullscreen1');
                }else{
                    $('.trading-view-main').removeAttr('style');
                    li.attr('title', '全屏');
                    i.removeClass('icon-exitfullscreen1').addClass('icon-fullscreen2');
                }
                $('.trading-view-container').toggleClass('fullscreen');
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

                app.httpData[ticker].push(barsData);
            }
        },

        /**
         * 获取socket调用参数
         * @param interval
         * @returns {string[]}
         */
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

        /**
         * 数据块处理
         * @param symbolInfo
         * @param resolution
         * @param rangeStartDate
         * @param rangeEndDate
         * @param onLoadedCallback
         */
        getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback) {
            if (this.interval !== resolution) this.unSubscribe(this.interval);

            //赋值时间粒度
            this.interval = resolution;

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
         * 获取widght配置
         */
        getWidgetConfig: function () {
            return {
                // debug: true,
                symbol: this.symbol,
                interval: this.interval,
                user_id: "public_user_id",
                fullscreen: false,
                autosize: true,
                container_id: 'trade-view',
                datafeed: this.datafeeds,
                custom_css_url: './../../../css/custom.css',
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
                pricescale: 10,
                ticker: app.symbol,
                supported_resolutions: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', '1D', '1W'],
                volume_precision: 8
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
