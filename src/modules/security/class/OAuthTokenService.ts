/// <reference path="../../../typings/types.d.ts" />

declare var KJUR:any;

/*@ngInject*/
class OAuthTokenService {

    constructor(private $location,
        private $window,
        private $settings,
        private config) {
    }

    /**
     * Set token.
     *
     *  @params {object} - Access token
     */

    setToken(data) {
        this.$settings.set(this.config.name, data);
    }

    /**
     * Get token.
     *
     *  @returns {object} - Access token
     */

    getToken() {
        this.restoreTokenFromURL();
        return this.$settings.get(this.config.name);
    }

    /**
     * Get accessToken.
     *
     * @returns {string} - Access token
     */

    getAccessToken() {
        return this.getToken() ? this.getToken().access_token : undefined;
    }

    /**
     * Get authorization Header.
     *
     * @returns {string} - 'Authorization' Header e.g 'Bearer XXX'
     */

    getAuthorizationHeader() {
        if (!(this.getTokenType() && this.getAccessToken())) {
            return;
        }

        return this.getTokenType().charAt(0).toUpperCase() + this.getTokenType().substr(1) + ' ' + this.getAccessToken();
    }

    /**
     * Get refresh Token.
     *
     * @returns {string} - 'Refresh token
     */

    getRefreshToken() {
        return this.getToken() ? this.getToken().refresh_token : undefined;
    }

    /**
     * Get tokenType.
     *
     * @returns {string} - Token type e.g. 'bearer', 'refresh'
     */

    getTokenType() {
        return this.getToken() ? this.getToken().token_type : undefined;
    }

    restoreTokenFromURL(): void {
        var accessToken: string;
        var content: string;

        accessToken = this.$location.search()['token'];

        if (accessToken && this.verifyTokenSignature(accessToken)) {
            this.$location.search('token', null);
            content = this.decodeToken(accessToken);
            this.setToken({
                access_token: accessToken,
                token_type: 'bearer',
                content: content
            })
        }
    }

    verifyTokenSignature(token) {
        var result = false;
        var publicKey = this.config.publicKey;

        try {
            result = KJUR.jws.JWS.verify(token, publicKey, ["RS256"]);
        } catch (ex) {
            console.error("OAuth Token Service Error: " + ex);
            result = false;
        }

        if (result == true) {
            console.log('Token Signature Valid');
        } else {
            console.log('Token Signature Not Valid');
        }

        return result;
    }

    urlBase64Decode(str) {
        var output = str.replace(/-/g, '+').replace(/_/g, '/');
        switch (output.length % 4) {
            case 0:
                {
                    break;
                }
            case 2:
                {
                    output += '==';
                    break;
                }
            case 3:
                {
                    output += '=';
                    break;
                }
            default:
                {
                    throw 'Illegal base64url string!';
                }
        }
        return this.$window.decodeURIComponent(this.$window.encodeURIComponent(this.$window.atob(output)));
    }

    decodeToken(token) {
        var parts = token.split('.');

        if (parts.length !== 3) {
            throw new Error('JWT must have 3 parts');
        }

        var decoded = this.urlBase64Decode(parts[1]);
        if (!decoded) {
            throw new Error('Cannot decode the token');
        }

        return JSON.parse(decoded);
    }

    getTokenExpirationDate(token) {
        var decoded;
        decoded = this.decodeToken(token);

        if (typeof decoded.exp === "undefined") {
            return null;
        }

        var d = new Date(0); // The 0 here is the key, which sets the date to the epoch
        d.setUTCSeconds(decoded.exp);

        return d;
    }

    isTokenExpired(token, offsetSeconds) {
        var d = this.getTokenExpirationDate(token);
        offsetSeconds = offsetSeconds || 0;
        if (d === null) {
            return false;
        }

        return !(d.valueOf() > (new Date().valueOf() + (offsetSeconds * 1000)));
    }

    /**
     * Remove token.
     */

    removeToken() {
        this.$settings.set(this.config.name);
    }

    setContent(tokenContent: any): void {
        this.$settings.set(this.config.name);
    }

    getContent() {
        var token = this.getToken();

        return token && token.content ? token.content : undefined;
    }

    getUserLogin(): string {
        var content = this.getContent();

        return content && content.user_name ? content.user_name : undefined;
    }

    getUserFullName(): any {
        var content = this.getContent();

        return content && content.full_name ? content.full_name : undefined;
    }

    getPermissions(): any[] {
        var content = this.getContent();

        return content && content.authorities ? content.authorities : undefined;
    }
}

class OAuthTokenServiceProvider implements ng.IServiceProvider {

    private config = {
        name: 'token'
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

    constructor() {
    }

    /*@ngInject*/
    $get($location, $window, $settings) {
        return new OAuthTokenService($location, $window, $settings, this.config);
    }
}

export default OAuthTokenService;
export { OAuthTokenServiceProvider, OAuthTokenService };
