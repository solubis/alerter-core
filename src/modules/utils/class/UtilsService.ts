/// <reference path="../../../typings/types.d.ts" />

/**
 * Small utils
 */

/*@ngInject*/
class UtilsService {

    constructor(private $filter,
                private $translate,
                private $dateFormat) {
    }

    /*
     Get form fields that changed, are part of model and convert them to form acceptable by server
     */
    formChanges(form, model) {
        var changes = {};

        if (!model) {
            return changes;
        }

        angular.forEach(form, (value, key) => {
            if (key[0] !== '$' && !value.$pristine) {
                if (model[key] !== undefined) {
                    changes[key] = model[key];
                }
            }
        });

        return changes;
    }

    /*
     Manually check $dirty and $valid
     when fields in sub-forms shouldn't be validated
     */
    isReadyToSave(form, exclusions) {
        var valid = true;
        var dirty = false;

        exclusions = exclusions || [];

        angular.forEach(form, (value, key) => {
            if (key[0] !== '$' && exclusions.indexOf(key) < 0) {
                if (value.$dirty) {
                    dirty = true;
                }
                valid = valid && value.$valid;
            }
        });

        return dirty && valid;
    }

    /*
     Check if object has any own properties
     */

    isEmpty(obj) {
        if (obj == null) return true;
        if (obj.length > 0)    return false;
        if (obj.length === 0)  return true;

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) return false;
        }

        return true;
    }

    /*
     Search in Array for first element (quicker than Array.prototype.filter)
     */

    arrayFilter(array, expression, flag = true) {
        var resultArray = this.$filter('filter')(array, expression, flag);

        return resultArray;
    }

    arraySearch(array, expression, flag = true) {
        var resultArray = this.$filter('filter')(array, expression, flag);

        return resultArray[0];
    }

    formatDate(date) {
        return date ? moment.unix(date).format(this.$dateFormat) : '';
    }
}

export default UtilsService;
