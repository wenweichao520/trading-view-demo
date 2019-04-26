function socketClass(options) {

    var object = {

        heartBeatTimer: null,

        options: options,

        messageMap: {},

        connState: 0,

        socket: null,

        url: 'wss://okexcomreal.bafang.com:10442/ws/v3',

        doOpen: function () {
            var self = this
            if (this.connState) return
            this.connState = 1
            this.afterOpenEmit = []
            var BrowserWebSocket = window.WebSocket || window.MozWebSocket
            var socket = new BrowserWebSocket(this.url)
            socket.binaryType = 'arraybuffer'
            socket.onopen = function (evt) {
                self.onOpen(evt)
            };
            socket.onclose = function (evt) {
                self.onClose(evt)
            };
            socket.onmessage = function (evt) {
                self.onMessage(evt.data)
            };
            socket.onerror = function (err) {
                self.onError(err)
            };
            this.socket = socket
        },

        onOpen: function (evt) {
            this.connState = 2
            this.heartBeatTimer = setInterval(this.checkHeartbeat.bind(this), 20000)
            this.onReceiver({Event: 'open'})
        },

        checkOpen: function () {
            return this.connState === 2
        },

        onClose: function () {
            this.connState = 0
            if (this.connState) {
                this.onReceiver({Event: 'close'})
            }
        },

        send: function (data) {
            this.socket.send(JSON.stringify(data))
        },

        emit: function (data) {
            return promise(function(resolve){
                object.socket.send(JSON.stringify(data))
                object.on('message', function (data) {
                    resolve(data)
                })
            })
        },

        onMessage: function (message) {
            message = pako.inflateRaw(message, {to: 'string'})
            try {
                var data = JSON.parse(message)
                this.onReceiver({Event: 'message', Data: data})
            } catch (err) {
                console.error(' >> Data parsing error:', err)
            }
        },

        checkHeartbeat: function () {
            var data = {
                'cmd': 'ping',
                'args': [Date.parse(new Date())]
            }
            this.send(data)
        },

        onError: function (err) {

        },

        onReceiver: function (data) {
            var callback = this.messageMap[data.Event]
            if (callback) callback(data.Data)
        },

        on: function (name, handler) {
            this.messageMap[name] = handler
        },

        doClose: function () {
            this.socket.close()
        },

        destroy: function () {
            if (this.heartBeatTimer) {
                clearInterval(this.heartBeatTimer)
                this.heartBeatTimer = null
            }
            this.doClose()
            this.messageMap = {}
            this.connState = 0
            this.socket = null
        }
    };

    return object;
}
