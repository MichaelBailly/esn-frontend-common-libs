'use strict';

const autosize = require('autosize');

angular.module('esn.form.helper')
  .factory('autosize', function() {
    return autosize;
  })
  .directive('esnTrackFirstBlur', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elem, attr, controller) {
        elem.one('blur', function() {
          controller._blur = true;
          if (scope.$parent) {
            scope.$parent.$digest();
          } else {
            scope.$digest();
          }
        });
      }
    };
  })
  .directive('passwordMatch', function() {
    return {
      restrict: 'A',
      scope: true,
      require: 'ngModel',
      link: function(scope, elem, attrs, control) {
        var checker = function() {
          var e1 = scope.$eval(attrs.ngModel);
          var e2 = scope.$eval(attrs.passwordMatch);

          return e1 === e2;
        };

        scope.$watch(checker, function(n) {
          control.$setValidity('unique', n);
        });
      }
    };
  })
  .directive('toggleSwitch', function($timeout) {
    return {
      restrict: 'E',
      replace: true,
      template: require('../../../views/modules/form/toggle-switch.pug'),
      scope: {
        ngModel: '=?',
        ngDisabled: '=?',
        color: '@?',
        label: '@?',
        form: '=?',
        onchangeFn: '&onchange'
      },
      link: function(scope) {
        if (scope.ngModel === undefined) {
          scope.ngModel = false;
        }
        scope.toggle = function() {
          if (scope.ngDisabled) {
            return;
          }

          scope.ngModel = !scope.ngModel;

          if (scope.form && scope.form.$setDirty) {
            scope.form.$setDirty();
          }

          $timeout(scope.onchangeFn, 0);
        };
        scope.color = scope.color || 'blue';
      }
    };
  })

  .directive('esnSubmit', function() {
    return {
      restrict: 'A',
      scope: {
        submitFn: '&esnSubmit'
      },
      link: function(scope, element) {

        function disableAndSubmit(element) {
          return function() {
            element.prop('disabled', true);

            scope.submitFn().finally(function() {
              element.prop('disabled', false);
            });
          };
        }

        if (element[0] && element[0].tagName === 'FORM') {
          angular.element('<input type="submit" class="hidden">').appendTo(element);

          element.on('submit', disableAndSubmit(element.find('[type="submit"]')));
        } else {
          element.on('click', disableAndSubmit(element));
        }

      }
    };
  })

  .directive('esnFormGroup', function($compile, $parse) {
    function link(scope, element, attrs) {
      var AVAILABLE_ERRORS = ['min', 'max', 'minlength', 'maxlength', 'pattern', 'email', 'required', 'url', 'date', 'datetimelocal', 'time', 'week', 'month', 'validator', 'asyncValidator'];
      var fgLineEle = element.find('.fg-line');
      var formControlEle = element.find('.form-control');
      var ngModelController = formControlEle.controller('ngModel');
      var formController = $parse(attrs.form)(scope) || scope.form;
      var validator = $parse(attrs.validator)(scope);
      var asyncValidator = $parse(attrs.asyncValidator)(scope);

      if (validator) {
        ngModelController.$validators.validator = validator;
      }
      if (asyncValidator) {
        ngModelController.$asyncValidators.asyncValidator = asyncValidator;
      }

      scope.options = {};

      if (!formController) {
        throw new Error('no form is specified and form is missing in scope');
      }

      if (formControlEle.attr('required')) {
        element.addClass('has-required');
      }

      scope.label = attrs.label;
      scope.helper = attrs.helper;

      //  use default css of .fg-line
      // .fg-line:not([class*=has-]):after {
      //    background: #2196F3;
      //  }
      fgLineEle.addClass('has-underline');

      formControlEle.bind('focus', function() {
        fgLineEle.removeClass('has-underline');
        element.addClass('has-focus');
      });

      formControlEle.bind('blur', function() {
        fgLineEle.addClass('has-underline');
        element.removeClass('has-focus');

        if (formControlEle.hasClass('ng-invalid')) {
          element.addClass('has-invalid');
        } else {
          element.removeClass('has-invalid');
        }
      });

      scope.elementForm = formController[formControlEle.attr('name')];

      _getErrorMessage();
      _updateErrorValue(_getFormControlValidateAttrs());

      scope.$watch(_getFormControlValidateAttrs, function(newAttrs, oldAttrs) {
        if (!angular.equals(newAttrs, oldAttrs)) {
          _updateErrorValue(newAttrs);
        }
      }, true);

      var template = '<div class="esn-form-message-container">' +
                      '<span ng-if="::helper" class="help-block">{{::helper}}</span>' +
                      '<esn-form-validate-message ' +
                        'ng-class="elementForm.$pristine && !elementForm.$touched ? \'pristine\' : \'dirty\'" ' +
                        'ng-if="::!helper" ' +
                        'options="options" ' +
                        'error="elementForm.$error" />' +
                    '</div>';
      var validateMessage = $compile(template)(scope);

      element.find('.form-group').append(validateMessage);

      function _getFormControlValidateAttrs() {
        var formControlAttrs = element.find('.form-control')[0].attributes;
        var attributes = {};

        angular.forEach(AVAILABLE_ERRORS, function(error) {
          if (formControlAttrs[error]) {
            attributes[error] = formControlAttrs[error].value;
          }
        });

        return attributes;
      }

      function _getErrorMessage() {
        angular.forEach(AVAILABLE_ERRORS, function(error) {
          var custom_error = error + 'ErrorMessage';

          scope.options[error] = {
            message: {
              error: attrs[custom_error]
            }
          };
        });
      }

      function _updateErrorValue(attibutes) {
        angular.forEach(attibutes, function(value, key) {
          scope.options[key].value = value;
        });
      }
    }

    return {
      restrict: 'E',
      template: require('../../../views/modules/form/esn-form-group.pug'),
      transclude: true,
      scope: true,
      link: link
    };
  })

  .component('esnFormValidateMessage', {
    template: require('../../../views/modules/form/esn-form-validate-message.pug'),
    bindings: {
      options: '<',
      error: '<'
    }
  })

  .directive('esnAutocompleteOff', function() {
    return {
      restrict: 'A',
      link: function(scope, element) {
        element.prepend(angular.element('<input style="display:none" type="text">'));
        element.prepend(angular.element('<input style="display:none" type="password">'));
      }
    };
  })
  .directive('autoResize', function($timeout) {
    return {
      restrict: 'A',
      link: function autoResizeLink(scope, element) {
        scope.initialHeight = scope.initialHeight || element[0].style.height;

        var resize = function() {
          element[0].style.height = scope.initialHeight;
          element[0].style.height = '' + element[0].scrollHeight + 'px';
        };

        element.on('input change', resize);
        $timeout(resize, 100);
      }
    };
  });
