/// <reference path="../../../typings/types.d.ts" />

import { SecurityService, AccessStatus, PermissionCheckType } from '../../security/class/SecurityService';

interface Attributes extends ng.IAttributes {
    authorizeType:string;
    authorizeAction:string;
    authorize:string;
}

/*@ngInject*/
function AuthorizeDirective($security:SecurityService):ng.IDirective {
    return {
        restrict: 'A',
        link: (scope:ng.IScope, element:ng.IAugmentedJQuery, attrs:Attributes) => {
            var makeVisible = () => {
                element.removeClass('hidden');
            };

            var makeHidden = () => {
                element.addClass('hidden');
            };

            var makeDisabled = () => {
                element.attr('ng-disabled', 'true');
            };

            var makeEnabled = () => {
                element.removeAttr('disabled');
            };

            var roles = attrs.authorize.split(',');
            var type = attrs.authorizeAction || "show";

            if (roles.length > 0) {
                var result:AccessStatus;

                result = $security.authorize(roles, true, PermissionCheckType[attrs.authorizeType]);

                if (result === AccessStatus.Authorised) {
                    type === 'show' ? makeVisible() : makeEnabled();
                } else {
                    type === 'show' ? makeHidden() : makeDisabled();
                }
            }
        }
    };
}

export default AuthorizeDirective;
