/// <reference path="../../../typings/types.d.ts" />

/**
 * Saving and loading settings from local storage
 */

/*@ngInject*/
class SettingsService {

    private settings = {
        debug: false,
        path: ''
    };

    constructor(private $window,
        private config) {
        this.settings = JSON.parse($window.localStorage.getItem(this.config.storeName)) || this.settings;
    }

    getSettings() {
        return this.settings
    }

    saveSettings() {
        var text = JSON.stringify(this.settings);

        if (text && text !== '{}') {
            this.$window.localStorage.setItem(this.config.storeName, text);
        }
    }

    get(name) {
        return this.settings[name];
    }

    put(key, value = undefined) {
        if (value) {
            this.settings[key] = value;
        } else {
            delete this.settings[key];
        }
        this.saveSettings();
    }

    set(key, value = undefined) {
        this.put(key, value)
    }

    remove(key) {
        this.put(key);
    }
}

class SettingsServiceProvider implements ng.IServiceProvider {

    private config = {
        storeName: 'iq.settings'
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
    $get($window) {
        return new SettingsService($window, this.config);
    }
}

export default SettingsService;
export { SettingsServiceProvider, SettingsService };
