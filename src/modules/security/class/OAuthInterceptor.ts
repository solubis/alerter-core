/// <reference path="../../../typings/types.d.ts" />

/**
 * HTTP Interceptor for global OAuth handling
 */

import OAuthTokenService from './OAuthTokenService';

/*@ngInject*/
class OAuthHttpInterceptor {

    /*@ngInject*/
    public static factory($rootScope: ng.IRootScopeService, $q: ng.IQService, $oauthToken) {
        return new OAuthHttpInterceptor($rootScope, $q, $oauthToken);
    }

    constructor(
        private $rootScope: ng.IRootScopeService,
        private $q: ng.IQService,
        private $oauthToken) {
    }

    request = (config) => {
        /*
         Inject `Authorization` header.
         */
        if (!config.url.match(/.html/) && this.$oauthToken.getAuthorizationHeader()) {
            config.headers = config.headers || {};

            if (!config.headers.Authorization) {
                config.headers.Authorization = this.$oauthToken.getAuthorizationHeader();
            }
        }

        return config;
    };

    responseError = (rejection) => {
        var error: any = {
            status: rejection.status,
            message: rejection.data && rejection.data.error_description ? rejection.data.error_description : 'Unknown OAuth Error ' + JSON.stringify(rejection),
        };
        /*
         Catch `invalid_request` and `invalid_grant` errors and ensure that the `token` is removed.
         */
        if (400 === rejection.status && rejection.data &&
            ('invalid_request' === rejection.data.error || 'invalid_grant' === rejection.data.error)) {

            this.$oauthToken.removeToken();

            this.$rootScope.$broadcast('$oauth:error', error);
        }

        /*
         Catch `invalid_token` and `unauthorized` errors.
         The token isn't removed here so it can be refreshed when the `invalid_token` error occurs.
         */
        if (401 === rejection.status) {
            if (
                (rejection.data && 'invalid_token' === rejection.data.error) ||
                (rejection.headers('www-authenticate') && 0 === rejection.headers('www-authenticate').indexOf('Bearer'))) {

                error.message = 'Invalid token. Should login.';

                this.$rootScope.$broadcast('$oauth:error', error);
            } else {
                error.url = rejection.config.url;
                this.$rootScope.$broadcast('$http:error:authorization', error);
            }
        }

        if (403 === rejection.status) {
            this.$rootScope.$broadcast('$oauth:error', error);
        }

        return this.$q.reject(rejection);
    }
}

export default OAuthHttpInterceptor;
