'use strict';

// Public navigation settings only. Never put passwords or tokens here.
// Empty routes keep the landing in presentation mode until the cabinet is ready.
window.SKLADNO_APP = Object.freeze({
  routes: Object.freeze({
    login: '',
    request: '',
    partner: '',
    ...(window.SKLADNO_APP?.routes || {}),
  }),
});
