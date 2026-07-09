const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  uploadDocument,
  listDocuments,
  downloadDocument,
  deleteDocument,
  signDocument
} = require('../controllers/documentController');

router.post('/', protect, upload.single('file'), uploadDocument);
router.get('/', protect, listDocuments);
router.get('/:id/download', protect, downloadDocument);
router.delete('/:id', protect, deleteDocument);
router.post('/:id/sign', protect, signDocument);

module.exports = router;
