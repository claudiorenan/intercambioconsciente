/**
 * Test setup - mock browser globals needed by the platform modules.
 */

// Toast container used by ErrorHandler.showToast
const toastContainer = document.createElement('div');
toastContainer.id = 'toastContainer';
document.body.appendChild(toastContainer);
