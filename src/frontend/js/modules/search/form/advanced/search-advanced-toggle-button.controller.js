(function(angular) {
  'use strict';

  angular.module('esn.search').controller('ESNSearchAdvancedToggleButtonController', ESNSearchAdvancedToggleButtonController);

  function ESNSearchAdvancedToggleButtonController($mdPanel) {
    var self = this;
    var panelRef;

    self.showAdvancedForm = showAdvancedForm;
    self.canShowAdvancedForm = canShowAdvancedForm;

    function canShowAdvancedForm() {
      return self.provider && self.provider.hasAdvancedSearch;
    }

    function showAdvancedForm() {
      if (!panelRef) {
        createPanel();
      }

      panelRef.open();
    }

    function createPanel() {
      var position = $mdPanel.newPanelPosition()
        .relativeTo('.search-header-form')
        .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);

      var config = {
        attachTo: angular.element(document.body),
        controllerAs: 'ctrl',
        controller: function($scope) {
          $scope.query = self.query;
          $scope.provider = self.provider;
          $scope.$hide = hide;
          $scope.search = search;

          function hide() {
            if (panelRef) {
              panelRef.hide();
            }
          }

          function search() {
            hide();
            panelRef.destroy();
            panelRef = undefined;
            self.search({ query: $scope.query });
          }
        },
        disableParentScroll: true,
        panelClass: 'search-header-settings-panel',
        template: require("./search-advanced-form-content.pug"),
        hasBackdrop: false,
        position: position,
        trapFocus: true,
        clickOutsideToClose: true,
        escapeToClose: true,
        focusOnOpen: true
      };

      panelRef = $mdPanel.create(config);
    }
  }
})(angular);
