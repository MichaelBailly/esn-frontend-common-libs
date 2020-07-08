require('./video-viewer.constant.js');
require('../../attachment-registry.service.js');

(function(angular) {
  'use strict';

  angular.module('esn.attachment')
    .run(function(esnAttachmentRegistryService, ESN_ATTACHMENT_VIDEO_VIEWER) {
      esnAttachmentRegistryService.addViewer(ESN_ATTACHMENT_VIDEO_VIEWER);
    });
})(angular);
