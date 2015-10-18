/// <reference path="../../../typings/types.d.ts" />

/**
 * REST communication and error handling
 */

/*@ngInject*/
class RestService {

    public url;

    private headers = { 'Content-Type': 'application/json;charset=utf-8' };
    private isOffline;
    private isMockupEnabled;

    constructor(
        private $http,
        private $q,
        private $window,
        private $rootScope,
        private $log,
        private config) {

        /*
         Internet connection mockup/online notification
         */

        var updateOnlineStatus = () => {
            this.isOffline = !navigator.onLine;

            if (this.isOffline) {
                $rootScope.$broadcast('$rest:offline');
            } else {
                $rootScope.$broadcast('$rest:online');
            }
        };

        if ($window.addEventListener) {
            $window.addEventListener('online', updateOnlineStatus);
            $window.addEventListener('offline', updateOnlineStatus);
        }
        else {
            $window.attachEvent('online', updateOnlineStatus);
            $window.attachEvent('offline', updateOnlineStatus);
        }

        /*
         Configuration
         */

        this.isMockupEnabled = config.mockupEnabled;

        if (this.isMockupEnabled) {
            $log.warn('Using Mockup Data');

            return;
        }

        if (config.restURL) {
            this.url = config.restURL.trim();

            if (this.url.charAt(this.url.length - 1) !== '/') {
                this.url += '/';
            }
        }

        $log.info('REST ' + this.url);
    }

    init() {
        return this.get({ command: 'version' })
            .then((result) => {
                this.$rootScope.$restVersion = result.version + '.' + result.revision;
                this.$log.info('REST', this.$rootScope.$restVersion, moment(result.date).format('DD.MM.YYYY hh:mm'));
            });
    }

    /**
     * Mockup response - return JSON file from 'data' folder instead server request
     *
     * @param {object} config
     * @returns {promise} - Request promise
     */

    mockupResponse(config) {
        var request;

        request = this.$http
            .get('data/' + config.command + '.json')
            .then((response) => {
                var content = response.data.content;

                if (this.isMockupEnabled && content) {
                    content = content.slice(config.params.number * config.params.size, (config.params.number + 1) * config.params.size);

                    response.data.content = content;
                    response.data.numberOfElements = content.length;
                }

                return response.data;
            });

        return request;
    }

    /**
     * Adds request header
     *
     * @param name
     * @param value
     */

    putHeader(name, value) {
        this.headers[name] = value;
    }

    /**
     * Executes HTTP request
     *
     * @param method - HTTP method e.g. PUT, POST etc.
     * @param config - config {command: 'REST server endpoint command', params, data}
     * @returns {promise}
     */

    request(method, config) {
        var deferred = this.$q.defer();

        if (!config.command) {
            throw new Error('REST Error: Command is required for REST call : ' + JSON.stringify(config));
        }

        config.url = this.url + config.command;
        config.method = method;
        config.headers = angular.extend(this.headers, config.headers);
        config.params = config.params || {};

        if (this.isMockupEnabled || config.mockup) {
            return this.mockupResponse(config);
        }

        this.$http(config)
            .success((data, status) => {
                this.$log.debug('RESPONSE ', config.command + ': ', 'status: ' + status + (data.content ? ', ' + (data.content && data.content.length) + ' items' : ''));

                if (data.result === 'error') {
                    this.$log.warn('Application error: "' + data.message + '" for: ' + JSON.stringify(config));

                    deferred.reject({
                        status: status,
                        message: data
                    });

                    return;
                }

                deferred.resolve(data);
            })
            .error((data, status) => {
                deferred.reject({
                    status: status,
                    message: data
                });
            });

        return deferred.promise;
    }

    post(params) {
        return this.request('POST', params);
    }

    patch(params) {
        return this.request('PATCH', params);
    }

    get(params) {
        return this.request('GET', params);
    }

    put(params) {
        return this.request('PUT', params);
    }

    remove(params) {
        return this.request('DELETE', params);
    }
}

class RestServiceProvider implements ng.IServiceProvider {

    private config = {
        restURL: window.location['origin']
    };

    /**
     * Configure.
     *
     * @param {object} params - An `object` of params to extend.
     */

    configure(params) {
        if (!(params instanceof Object)) {
            throw new TypeError('Invalid argument: `config` must be an `Object`.');
        }

        angular.extend(this.config, params);

        return this;
    }

    /*@ngInject*/
    $get($http, $q, $window, $rootScope, $log) {
        return new RestService($http, $q, $window, $rootScope, $log, this.config);
    }
}

export default RestService;
export { RestServiceProvider, RestService };
