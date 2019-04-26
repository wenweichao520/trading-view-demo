window.promise = function (fn) {
    this.value = ''; // 保存异步方法的结果
    this.status = 'pending'; // promise 状态
    this.resolveFn = []; // 保存resolve时的回调方法
    this.rejectFn = []; // 保存出错时的回调方法

    function resolve(val) {
        this.value = val;
        this.status = 'resolved';

        // 状态变化时，通知被观察者执行回调函数
        if (this.resolveFn[0]) {
            this.resolveFn[0](val);
        }
    }

    function reject(err) {
        this.value = err;
        this.status = 'rejected';

        if (this.rejectFn[0]) {
            this.rejectFn[0](err);
        }
    }


    try {
        // 采用回调方式保证promise的结果会在主进程执行完后返回
        setTimeout(fn, 0, resolve.bind(this), reject.bind(this))
    } catch (err) {
        setTimeout(reject, 0, err);
    }
};
promise.resolve = function (result) {
    // 直接返回一个resolve状态的promise
    return new promise(function (resolve) {
        resolve(result)
    })
};
promise.reject = function (err) {
    // 直接返回一个reject状态的promise
    return new promise(function (resolve, reject) {
        reject(err)
    })
};

promise.prototype = {
    //then是最复杂的方法，promise不同的状态下有不同的处理方式
    then(resolveFn, rejectFn) {
        var $this = this;

        // 如果then没有传值，则直接返回promise实例本身
        if (!(resolveFn instanceof Function) && !(rejectFn instanceof Function)) {
            return this;
        }
        if (this.status === 'pending') {
            // return 一个promise达到链式调用的效果
            return new promise(function (resolve, reject) {
                if (resolveFn instanceof Function) {
                    // 关键点  将事件注册到观察者，形成一条观察者链
                    $this.resolveFn.push(function (result) {
                        try {
                            let a = resolveFn(result);
                            // 如果返回结果是一个promise，那么将这个promise的结果注入到返回的promise中
                            if (a instanceof promise) {
                                a.then(function (result) {
                                    resolve(result)
                                })
                            } else {
                                resolve(a);
                            }
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
                if (rejectFn instanceof Function) {
                    $this.rejectFn.push(function (err) {
                        try {
                            let a = rejectFn(err);
                            // 如果返回结果是一个promise，那么将这个promise的结果注入到返回的promise中
                            if (a instanceof promise) {
                                a.then(function (result) {
                                    reject(result)
                                })
                            } else {
                                reject(a);
                            }
                        } catch (err) {
                            reject(err);
                        }
                    });
                } else {
                    $this.rejectFn.push(reject)
                }
            })
        }
        if (this.status === 'resolved') {
            // 校验传入回调是否合法，不合法则不做操作，返回实例本身
            if (resolveFn instanceof Function) {
                try {
                    let a = resolveFn($this.value);
                    if (a instanceof promise) {
                        return a;
                    } else {
                        return promise.resolve(a);
                    }
                } catch (err) {
                    return promise.reject(err);
                }
            } else {
                return this;
            }

        }
        if (this.status === 'rejected') {
            if (rejectFn instanceof Function) {
                try{
                    let a = rejectFn(this.value);
                    if (a instanceof promise) {
                        return a;
                    } else {
                        return promise.resolve(a);
                    }
                }catch(err){
                    return promise.reject(err)
                }

            } else {
                return this;
            }
        }
    },
    catch(fn) {
        this.then(null,fn);
    }
};
