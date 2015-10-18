# Alerter Core

Utils Module
- Settings
- REST
- Config
- Utils

Security Module

## Alerter Utils

Utils Module
- Settings
- REST
- Config
- Utils

## Alerter Security

Alerter Security has two parts:

- External Login Form Application that authenticates user and passes token to client application
- Library that automates token management, routing security, authorization

## Using external Login Form Application

All applications, no matter their location, can use external Login Form to authenticate their users.
The external application has following benefits:

- works with CORS and passes token in URL not localStorage so it can be separately deployed
- uses redirect URL so it honors users URL (e.g user has link passed to her via email - it uses it, application authenticates her and sends back to her link)

### Step 1

Use normal Angular authentication flow (HTTP error handling, state changing using UI Router etc.)

When it's necessary to authenticate user redirect her to URL of external login application.
Pass to Login external application URI-Encoded param `redirect_url` so, it can redirect user to a place you want after succesfull authentication.

Example of URL:  

```
If you want to authenticate user with external login applcation at `http://wfp-ci/security/` and send her back to `http://localhost//index.html#/alerts/list`:


http://wfp-ci/dev/security/#?redirect_url=http:%2F%2Flocalhost%2Findex.html#%2Falerts%2Flist
```

Example of redirect from client application to login application:

```
$window.location.assign('http:/wfp-ci/dev/security/#?redirect_url=' + encodeURI('' + this.$window.location));
```

### Step 2

After authenticating login application redirects to URL specified in `redirect_url` search param of previous request with access token encoded in `token` param:

```
http://localhost/index.html#/alert/list?token=eyJhbGciOiJSUzI1NiJ9.eyJmdWxs .... (etc.)
```

### Step 3

Read and decode token for payload (eg. list of permissions, full name of user etc.), and use it as you would use it normally (save it in local storage or cookie, add it to Authentication header etc.)

Example:
```
    restoreTokenFromURL():void {
        var accessToken:string;
        var content:string;

        accessToken = this.$location.search()['token']; // get access token from ULR

        if (accessToken) {
            this.$location.search('token', null); // remove token from URL
            content = this.jwtHelper.decodeToken(accessToken); // decode token using angular-jwt
            this.setToken({
                access_token: accessToken,
                token_type: 'bearer',
                content: content
            }) // set token - save it in local storage for future use
        }
    }
```

Be aware that $location.search works only in HTML5 mode with hashbang in URL (if not, you need to use window.location.seacrh instead).

All above tasks are automated when using iQ Security Library (read below).

## Using Alerter Security library to automate token management

Alerter Security Library provides following functionality:

1. token retrieval from URL
2. token decoding
3. token signature verification using public key
4. saving token and permissions in localstorage
5. redirect to login form using current URL, error handling etc.
6. configuration management

### To use Alerter Security Libarary

#### Add to bower.json dependencies

`"core": "git@code.solubis.com:Alerter/core.git#develop"`

#### Add module `Alerter.security` to angular

`angular.module('squealer', ['Alerter.ui', 'Alerter.security', 'modules.html'...]);`

####  Add parameters to `config.js` if you want to use `$config` service and provider

```
window.IQ_CONFIG = {
    'version': '0.13.2',
    'restURL': 'http://' + window.location.hostname + ':8083',
    'loginURL': 'http://' + window.location.hostname + ':9999',
    'publicKey': '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnGp/Q5lh0P8nPL21oMMrt2RrkT9AW5jgYwLfSUnJVc9G6uR3cXRRDCjHqWU5WYwivcF180A6CWp/ireQFFBNowgc5XaA0kPpzEtgsA5YsNX7iSnUibB004iBTfU9hZ2Rbsc8cWqynT0RyN4TP1RYVSeVKvMQk4GT1r7JCEC+TNu1ELmbNwMQyzKjsfBXyIOCFU/E94ktvsTZUHF4Oq44DBylCDsS1k7/sfZC2G5EU7Oz0mhG8+Uz6MSEQHtoIi6mc8u64Rwi3Z3tscuWG2ShtsUFuNSAFNkY7LkLn+/hxLCu2bNISMaESa8dG22CIMuIeRLVcAmEWEWH5EEforTg+QIDAQAB\n-----END PUBLIC KEY-----',
    'maxFileAttachmentSize': 1048576
};
```

####  Configure application

Below is sample application that uses Login Form. This applications configures security and oath service providers from config.js (you can do it manually if you like)

*Token retrieval, decoding, persisting in localstorage, signature verification and authorization header insertion are all automatic.*

```
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="../src/styles/app.css">
</head>

<body ng-app="app" ng-controller="AppController as ctrl">

<h1>Simple Demo</h1>

<p> This applications configures security and oath service providers from config.js</p>
<p> Token retrieval, decoding, persisting in localstorage, signature verification and authorization header insertion are all automatic</p>

<p>{{ ctrl.permissions }}</p>

<button ng-click="ctrl.logout()" class="btn btn-primary">Logout</button>

<script src="config.js"></script>

<script src="../lib/ui/dist/js/vendor.js"></script>
<script src="../lib/ui/dist/js/ui.js"></script>
<script src="../lib/core/dist/core.js"></script>

<script>
    angular.module('app', ['Alerter.ui', 'Alerter.security'])

        .config(function ($configProvider, $securityProvider, $oauthTokenProvider) {
            var config = $configProvider.$get();

            $securityProvider.configure(config);
            $oauthTokenProvider.configure(config);
        })

        .controller('AppController', function ($scope, $security, $http, $config) {
            var _this = this;

            // This is the call to secured resource - Authoriation header is automatically added

            $http.get($config.restURL + '/version')
                .then(function (response) {
                    console.log('REST ' + response.data.version);
                });

            this.logout = function () {
                $security.logout();
            };

            // This is how you get all permissions from token

            this.permissions = $security.getPermissions();
        });
</script>

</body>
</html>
```

#### Use ui-router integration

```

angular.module('squealer', ['Alerter.ui', 'Alerter.security', 'modules.html',
    core.name, alerts.name, dictionaries.name, workflow.name, dashboard.name, menu.name])

    .config(($configProvider, $oauthTokenProvider, $securityProvider) => {
        var config = $configProvider.$get();

        $securityProvider.configure(config);
        $oauthTokenProvider.configure(config);
    })

    .run(($log, $rootScope, $window, $config, $error, $toast, $timeout, $security) => {

        /*
         Authentication management
         */
        $rootScope.isAuthenticated = $security.isAuthenticated();

        let onLoginRequired = () => {
            $error.warning('Authorization error', 'Full authentication is required to access this resource');
        };

        let onNotAuthorised = () => {
            $window.location.href = '#dashboard';
        };

        $rootScope.$on("$stateChangeStart", (event, toState) => $security.stateChangeStart(event, toState, onLoginRequired, onNotAuthorised));

        $rootScope.$on('$oauth:error', (event, error) => {
                if (error.status !== 403) {
                    $security.redirectToLogin();
                    $error.warning('Authorization error', error);
                } else {
                    $error.critical('Authorization error', error);
                }
        });

    });
```

####  Use authorize directive for simple checks or `authorize` and `owner` helper functions for more advanced


```
<td authorize="ALERTER_ALERT_EDIT_FOREIGN, ALERTER_ALERT_EDIT_OWN, ALERTER_ALERT_REMOVE_TEST">
        <button type="button"
                class="btn btn-icon list-command"
                ng-click="ctrl.edit(alert)"
                ng-if="!alert.finalized && (authorize('ALERTER_ALERT_EDIT_FOREIGN') || (authorize('ALERTER_ALERT_EDIT_OWN') && owner(alert.assignee.user)))">
                <i class="md md-edit"></i>
        </button>

        <button ng-if="alert.testMode"
                type="button"
                class="btn btn-icon list-command"
                ng-click="ctrl.remove(alert)"
                authorize="ALERTER_ALERT_REMOVE_TEST">
                <i class="md md-delete"></i>
        </button>
</td>
```

#### Use states security


```
 $stateProvider
            .state('alerts', {
                parent: 'app',
                url: '/alerts/list?{query:dynamicQuery}',
                templateUrl: 'modules/alerts/html/alerts.html',
                controller: 'AlertListController as ctrl',
                access: {
                    requiredPermissions: ['ALERTER_ALERT_LIST']
                }
            })
```


#### Use $security service


```
var user = this.$security.getUserLogin();

var permissions = $security.getPermissions();

$security.logout();

$security.authorize('ALERT_LIST');

$security.getOrganisation();
```

*Docs will come if needed*


## Copyright and License

Copyright 2015 Solubis
