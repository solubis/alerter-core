/// <reference path="../../../typings/types.d.ts" />

/**
 * HTTP Interceptor for global error handling
 */

function replacer(key, value) {
    if (typeof value === "string" && value.length > 35) {
        return value.substring(0,34)+"...";
    }
    return value;
}

/*@ngInject*/
class HttpInterceptor {

    /*@ngInject*/
    public static factory($rootScope:ng.IRootScopeService, $q:ng.IQService, $log:ng.ILogService) {
        return new HttpInterceptor($rootScope, $q, $log);
    }

    constructor(private $rootScope:ng.IRootScopeService,
                private $q:ng.IQService,
                private $log:ng.ILogService) {
    }

    request = (config) =>{
        if (config.command) {
            this.$log.debug(config.method + " " + config.command +
                ": params " + JSON.stringify(config.params, replacer) +
                ", headers " + JSON.stringify(config.headers, replacer) +
                (config.data ? ", body: " + JSON.stringify(config.data, replacer) : "")
            );
        }

        return config;
    };

    responseError = (rejection) => {

        this.$log.error('HTTP Response Error, status: ' + rejection.status + ' message: ' + JSON.stringify(rejection.data, replacer));

        rejection.message = rejection.data && rejection.data.error_description ? rejection.data.error_description : 'Unknown server error';
        rejection.url = rejection.config.url;

        switch (rejection.status) {
            case 0:
            case 500:
            case 502:
            case 503:
                this.$rootScope.$broadcast('$rest:error:communication', rejection);
                break;
            case 400:
            case 405:
                this.$rootScope.$broadcast('$rest:error:request', rejection);
                break;
            case 401:
            case 403:
                this.$rootScope.$broadcast('$rest:error:authorization', rejection);
                break;
        }

        return this.$q.reject(rejection);
    }
}

export default HttpInterceptor;
