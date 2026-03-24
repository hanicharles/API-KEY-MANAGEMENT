const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/apiKeyController');

// Dashboard
router.get('/dashboard', ctrl.getDashboardStats);

// API Key CRUD
router.get('/keys', ctrl.getApiKeys);
router.get('/keys/:id', ctrl.getApiKey);
router.post('/keys', ctrl.addApiKey);
router.put('/keys/:id', ctrl.updateApiKey);
router.delete('/keys/:id', ctrl.deleteApiKey);
router.get('/keys/:id/reveal', ctrl.revealApiKey);

// Sync
router.post('/keys/:id/sync', ctrl.syncApiKey);
router.post('/sync-all', ctrl.syncAllKeys);

module.exports = router;
