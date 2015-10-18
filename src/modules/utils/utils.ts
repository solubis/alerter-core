/// <reference path="../../typings/types.d.ts" />

/**
 * Module with services for error handler, local storage settings and small utils
 */

import { SettingsServiceProvider } from './class/SettingsService';
import { RestServiceProvider } from './class/RestService';
import ConfigServiceProvider from "./class/ConfigService";
import HttpInterceptor from './class/HttpInterceptor';
import UtilsService from './class/UtilsService';

var module = angular.module('fds.utils', [])

    .value('$dateFormat', 'DD.MM.YYYY HH:mm:ss')

    .filter('dateFormat', ($utils) => (value) => $utils.formatDate(value))

    .config(function ($httpProvider) {
        $httpProvider.interceptors.push(HttpInterceptor.factory);
    })

    .provider('$rest', RestServiceProvider)

    /*
     Utility service
     */

    .provider('$config', ConfigServiceProvider)

    /*
     Utility service
     */

    .service('$utils', UtilsService)

    /*
     Local storage management
     */

    .provider('$settings', SettingsServiceProvider);


export default module;
