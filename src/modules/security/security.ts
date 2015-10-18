/// <reference path="../../typings/types.d.ts" />

import { SecurityServiceProvider, SecurityService, AccessStatus } from './class/SecurityService';
import { OAuthTokenServiceProvider } from './class/OAuthTokenService';
import OAuthInterceptor from './class/OAuthInterceptor';
import QueryStringService from './class/QueryStringService';
import AuthorizeDirective from './class/AuthorizeDirective';

import utils from '../../modules/utils/utils';

import 'jsrsasign';

var module = angular.module('fds.security', [utils.name])

    .config(($httpProvider, $configProvider, $securityProvider:SecurityServiceProvider) => {
        var config = $configProvider.$get();

        $securityProvider.configure(config);
        $httpProvider.interceptors.push(OAuthInterceptor.factory);
    })

    .run(($rootScope, $security) => {
        $rootScope.authorize = $security.authorize.bind($security);
        $rootScope.owner = $security.owner.bind($security);

        if ($security.isAuthenticated()) {
            $rootScope.userLogin = $security.getUserLogin();
            $rootScope.userFullName = $security.getUserFullName();
        }
    })

    .provider('$security', SecurityServiceProvider)

    .provider('$oauthToken', OAuthTokenServiceProvider)

    .service('$queryString', QueryStringService)

    .directive('authorize', AuthorizeDirective)

export default module;
