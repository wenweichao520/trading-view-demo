function datafeesClass(app){

    var datafeeds = {

        self: app,

        barsUpdater: null,

        onReady: function(callback){
            return new Promise((resolve, reject) => {
                var configuration = datafeeds.defaultConfiguration()
                if (datafeeds.self.getConfig) {
                    configuration = Object.assign(datafeeds.defaultConfiguration(), datafeeds.self.getConfig())
                }
                resolve(configuration)
            }).then(function(data){
                callback(data);
            });
        },

        resolveSymbol: function(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
            return new Promise((resolve, reject) => {
                var symbolInfo = datafeeds.defaultSymbol();
                if (datafeeds.self.getSymbol) {
                    symbolInfo = Object.assign(datafeeds.defaultSymbol(), datafeeds.self.getSymbol());
                }
                resolve(symbolInfo);
            }).then(function(data){
                onSymbolResolvedCallback(data);
            }).catch(function(err){
                onResolveErrorCallback(err);
            });
        },

        getBars: function(symbolInfo, resolution, rangeStartDate, rangeEndDate, onDataCallback, onErrorCallback) {
            var onLoadedCallback = function(data){
                data && data.length ? onDataCallback(data, {noData: true}) : onDataCallback([], {noData: true})
            };
            this.self.getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onLoadedCallback);
        },

        subscribeBars: function(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
            this.barsUpdater.subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback);
        },

        unsubscribeBars: function(subscriberUID) {
            this.barsUpdater.unsubscribeBars(subscriberUID);
        },

        defaultConfiguration: function() {
            return {
                supports_search: true,
                supports_group_request: false,
                supported_resolutions: ['1', '5', '15', '30', '60', '1D', '2D', '3D', '1W', '1M'],
                supports_marks: true,
                supports_timescale_marks: true,
                supports_time: true
            };
        },

        defaultSymbol: function() {
            return {
                'name': 'BTCUSDT',
                'timezone': 'Asia/Shanghai',
                'minmov': 1,
                'minmov2': 0,
                'pointvalue': 1,
                'fractional': false,
                'session': '24x7',
                'has_intraday': true,
                'has_no_volume': false,
                'description': 'BTCUSDT',
                'pricescale': 1,
                'ticker': 'BTCUSDT',
                'supported_resolutions': ['1', '5', '15', '30', '60', '1D', '2D', '3D', '1W', '1M']
            };
        }

    };

    datafeeds.barsUpdater = dateUpdaterClass(datafeeds);

    return datafeeds;
}
