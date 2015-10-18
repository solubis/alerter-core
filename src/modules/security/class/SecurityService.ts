/// <reference path="../../../typings/types.d.ts" />

import QueryStringService from './QueryStringService';
import OAuthTokenService from './OAuthTokenService';

export enum PermissionCheckType { One, All }
export enum AccessStatus { NotAuthorised, Authorised, LoginRequired }

const LOGIN_REDIRECT_TIMEOUT = 3000;

/*@ngInject*/
export class SecurityService {
    private userPermissions: any[];

    private headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic YWNtZTphY21lc2VjcmV0'
    };

    private url;

    constructor(
        private $http: ng.IHttpService,
        private $window: ng.IWindowService,
        private $location: ng.ILocationService,
        private $timeout: ng.ITimeoutService,
        private $queryString: QueryStringService,
        private $oauthToken: OAuthTokenService,
        private Organisation: any,
        private config: any) {

        this.url = config.oauthURL && config.oauthURL.trim();

        if (this.url && this.url.charAt(this.url.length - 1) !== '/') {
            this.url += '/';
        }
    }

    /**
     * Returns Organisation structure
     * @returns {promise}
     */
    getOrganisation(): ng.IPromise<any> {
        return this.$http
            .get(this.url + 'hierarchies')
            .then((result) => {
                return new this.Organisation(result.data, 'Hierarchies');
            });
    }

    /**
     * Verifies if the `user` is authenticated or not based on the `token`
     * cookie.
     *
     * @return {boolean}
     */
    isAuthenticated() {
        return !!this.$oauthToken.getToken();
    }


    /**
     * Redirect to application page
     */
    redirectToApplication(token) {
        var applicationURL;
        var createTokenURL = (applicationURL, applicationRoute, token) => {
            var url = `${applicationURL}#${applicationRoute}`;

            url += applicationRoute.indexOf('?') >= 0 ? '&' : '?';
            url += `token=${token}`;

            return url;
        }

        applicationURL = this.$location.search()['redirect_url'] || this.config.applicationURL;

        if (!applicationURL) {
            throw new Error('No application URL in config or redirect_url param');
        }

        applicationURL = createTokenURL(applicationURL, this.$location.hash(), token);

        this.$timeout(() => this.$window.location.assign(applicationURL));
    }

    /**
     * Redirect to login page
     */
    redirectToLogin(time = LOGIN_REDIRECT_TIMEOUT) {
        this.$timeout(() => {
            this.$window.location.assign(this.config.loginURL + '#?redirect_url=' + encodeURI('' + this.$window.location));
        }, time);
    }

    /**
     * Retrieves the `access_token`, decodes it and stores all data in local storage
     *
     * @param {string} username
     * @param {string} password
     *
     * @return {promise} A response promise.
     */
    login(username, password) {
        var data;
        var promise;

        var config = {
            headers: this.headers
        };

        data = angular.extend(this.config, { username: username, password: password });
        data = this.$queryString.stringify(data);

        promise = this.$http
            .post(this.url + 'oauth/token', data, config)
            .then((result) => {
                var token: any = result.data;

                this.redirectToApplication(token.access_token);
            });

        return promise;
    }

    /**
     * Retrieves the profile object (authorities, user_name)
     *
     * @return {promise} A response promise.
     */
    decodeTokenContent(token) {
        var data;

        var config = {
            headers: this.headers
        };

        data = 'token=' + token;

        return this.$http
            .post(this.url + 'oauth/check_token', data, config)
            .then((result) => result.data);
    }

    /**
     * Removes token and redirects to Login Page
     */
    logout() {
        this.$oauthToken.removeToken();
        this.redirectToLogin(0);
    }

    /**
     * Retrieves the `refresh_token` and stores the `response.data` on local storage
     * using the `OAuthToken`.
     *
     * @return {promise} A response promise.
     */
    getRefreshToken() {
        var data = {
            grant_type: 'refresh_token',
            refresh_token: this.$oauthToken.getRefreshToken(),
        };

        var config = {
            headers: this.headers
        };

        data = angular.extend(this.config, data);

        return this.$http
            .post(this.url + 'oauth/token', this.$queryString.stringify(data), config)
            .then((response) => {
                this.$oauthToken.setToken(response.data);

                return response;
            });
    }

    /**
     * Revokes the `token` and removes the stored `token` from cookies
     * using the `OAuthToken`.
     *
     * @return {promise} A response promise.
     */
    revokeToken() {
        var data = {
            token: this.$oauthToken.getRefreshToken() ? this.$oauthToken.getRefreshToken() : this.$oauthToken.getAccessToken()
        };

        data = angular.extend(this.config, data);

        return this.$http
            .post(this.url + 'oauth/revoke', this.$queryString.stringify(data), this.config)
            .then((response) => {
                this.$oauthToken.removeToken();

                return response;
            });
    }

    /**
     * Returns array of current user permissions
     *
     * @returns {string[]}
     */
    getPermissions(): string[] {
        return this.$oauthToken.getPermissions();
    }


    getUserPermissions() {
        if (!this.userPermissions) {
            let permissions = this.getPermissions();

            this.userPermissions = permissions ? this.getPermissions().map((item: string) => item.toLowerCase().trim()) : [];
        }

        return this.userPermissions;
    }


    /**
     * Returns user name
     *
     * @returns {string}
     */
    getUserLogin(): string {
        return this.$oauthToken.getUserLogin();
    }

    /**
     * Returns user name
     *
     * @returns {string}
     */
    getUserFullName(): string {
        return this.$oauthToken.getUserFullName();
    }

    /**
     * Return Access Token
     */
    getAccessToken(): string {
        return this.$oauthToken.getAccessToken();
    }

    /**
     * State handling for UI router
     *
     * @param event
     * @param toState
     * @param loginRequiredCallback
     * @param notAuthorisedCallback
     */
    stateChangeStart(event, toState, loginRequiredCallback, notAuthorisedCallback) {
        var authorised: AccessStatus;
        var requiredPermissions = toState.access && toState.access.requiredPermissions;
        var isLoginRequired = toState.access && toState.access.isLoginRequired || true;
        var permissionCheckTypeString: string = toState.access && toState.access.permissionCheckType;
        var permissionCheckType: PermissionCheckType = PermissionCheckType[permissionCheckTypeString] || PermissionCheckType.All;

        if (toState.access !== undefined) {
            authorised = this.authorize(requiredPermissions, isLoginRequired, permissionCheckType);

            if (authorised === AccessStatus.LoginRequired) {
                if (angular.isFunction(loginRequiredCallback)) {
                    loginRequiredCallback();
                }
                this.redirectToLogin(this.config.redirectToLoginTimeout);
                event.preventDefault();
            } else if (authorised === AccessStatus.NotAuthorised) {
                if (angular.isFunction(notAuthorisedCallback)) {
                    notAuthorisedCallback();
                }
                event.preventDefault();
            }
        }
    }

    /**
     * Method for checking user permissions
     *
     * @param {string, string[]} requiredPermissions
     * @param {boolean} isLoginRequired
     * @param {PermissionCheckType} permissionCheckType - all permissions (All) or one of them (One)
     * @returns {AccessStatus}
     */
    authorize(
        requiredPermissions: any,
        isLoginRequired: boolean = true,
        permissionCheckType: PermissionCheckType = PermissionCheckType.One): AccessStatus {

        var user = this.getUserLogin();
        var userPermissions = this.getUserPermissions();
        var length;
        var hasPermission: boolean = true;
        var permission: string;
        var i: number;

        /*
         Login required but no user logged in
         */
        if (isLoginRequired === true && !user) {
            return AccessStatus.LoginRequired;
        }

        /*
         Login required, user logged in but no permissions required
         */
        requiredPermissions = angular.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

        if ((isLoginRequired === true && user) && (requiredPermissions === undefined || requiredPermissions.length === 0)) {
            return AccessStatus.Authorised;
        }

        length = requiredPermissions.length;

        /*
         Permission required
         */
        if (requiredPermissions && userPermissions) {

            for (i = 0; i < length; i++) {
                permission = requiredPermissions[i].toLowerCase().trim();

                if (permissionCheckType === PermissionCheckType.All) {
                    hasPermission = hasPermission && userPermissions.indexOf(permission) > -1;
                    /*
                     if all the permissions are required and hasPermission is false there is no point carrying on
                     */
                    if (hasPermission === false) {
                        break;
                    }
                } else if (permissionCheckType === PermissionCheckType.One) {
                    hasPermission = userPermissions.indexOf(permission) > -1;
                    /*
                     if we only need one of the permissions and we have it there is no point carrying on
                     */
                    if (hasPermission) {
                        break;
                    }
                }
            }

            return hasPermission ? AccessStatus.Authorised : AccessStatus.NotAuthorised;
        }
    }

    /**
     * Check if passed user is current user
     */
    owner(userName) {
        return userName === this.getUserLogin();
    }
}

export class SecurityServiceProvider implements ng.IServiceProvider {
    private config = {
        'grant_type': 'password',
        'client_id': 'acme',
        'scope': 'openid'
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
    $get($http, $window, $location, $timeout, $queryString, $oauthToken, Organisation) {
        return new SecurityService($http, $window, $location, $timeout, $queryString, $oauthToken, Organisation, this.config)
    }
}

export default SecurityService;
