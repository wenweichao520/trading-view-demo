function dateUpdaterClass(datafeeds) {

    var object = {

        subscribers: {},

        requestsPending: 0,

        historyProvider: datafeeds,

        subscribeBars: function (symbolInfo, resolution, newDataCallback, listenerGuid) {
            this.subscribers[listenerGuid] = {
                lastBarTime: null,
                listener: newDataCallback,
                resolution: resolution,
                symbolInfo: symbolInfo
            }
        },

        unsubscribeBars: function (listenerGuid) {
            delete this.subscribers[listenerGuid]
        },

        updateData: function () {
            if (this.requestsPending) return
            this.requestsPending = 0
            for (var listenerGuid in this.subscribers) {
                this.requestsPending++
                this.updateDataForSubscriber(listenerGuid).then(function () {
                    object.requestsPending--
                }).catch(function () {
                    object.requestsPending--
                })
            }
        },

        updateDataForSubscriber: function (listenerGuid) {
            return new Promise((resolve, reject) => {
                var subscriptionRecord = object.subscribers[listenerGuid]
                var rangeEndTime = parseInt((Date.now() / 1000).toString())
                var rangeStartTime = rangeEndTime - object.periodLengthSeconds(subscriptionRecord.resolution, 10)
                this.historyProvider.getBars(subscriptionRecord.symbolInfo, subscriptionRecord.resolution, rangeStartTime, rangeEndTime, function (bars) {
                    object.onSubscriberDataReceived(listenerGuid, bars);
                    resolve();
                }, function () {
                    reject();
                });
            })
        },

        onSubscriberDataReceived: function (listenerGuid, bars) {
            if (!this.subscribers.hasOwnProperty(listenerGuid)) return
            if (!bars.length) return
            var lastBar = bars[bars.length - 1]
            var subscriptionRecord = this.subscribers[listenerGuid]
            if (subscriptionRecord.lastBarTime !== null && lastBar.time < subscriptionRecord.lastBarTime) return
            var isNewBar = subscriptionRecord.lastBarTime !== null && lastBar.time > subscriptionRecord.lastBarTime
            if (isNewBar) {
                if (bars.length < 2) {
                    throw new Error('Not enough bars in history for proper pulse update. Need at least 2.');
                }

                var previousBar = bars[bars.length - 2]
                subscriptionRecord.listener(previousBar)
            }

            subscriptionRecord.lastBarTime = lastBar.time
            subscriptionRecord.listener(lastBar)
        },

        periodLengthSeconds: function (resolution, requiredPeriodsCount) {
            var daysCount = 0
            if (resolution === 'D' || resolution === '1D') {
                daysCount = requiredPeriodsCount
            } else if (resolution === 'M' || resolution === '1M') {
                daysCount = 31 * requiredPeriodsCount
            } else if (resolution === 'W' || resolution === '1W') {
                daysCount = 7 * requiredPeriodsCount
            } else {
                daysCount = requiredPeriodsCount * parseInt(resolution) / (24 * 60)
            }
            return daysCount * 24 * 60 * 60
        }

    };

    return object;
}
