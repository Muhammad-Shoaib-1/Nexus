const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');

const serializeDocument = (doc) => {
  const obj = doc.toObject();
  return {
    id: obj._id.toString(),
    name: obj.name,
    mimeType: obj.mimeType,
    size: obj.size,
    shared: obj.shared,
    uploadedBy: obj.uploadedBy.name
      ? { id: obj.uploadedBy._id.toString(), name: obj.uploadedBy.name }
      : obj.uploadedBy.toString(),
    signature: obj.signature?.signedAt
      ? {
          signedByName: obj.signature.signedByName,
          signatureText: obj.signature.signatureText,
          signedAt: new Date(obj.signature.signedAt).toISOString()
        }
      : null,
    createdAt: new Date(obj.createdAt).toISOString(),
    downloadUrl: `/api/documents/${obj._id}/download`
  };
};

// @route  POST /api/documents
// @desc   Upload a document. multipart/form-data field name: "file". Optional "shared" field.
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const doc = await Document.create({
      name: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user._id,
      shared: req.body.shared === 'true'
    });

    const populated = await doc.populate('uploadedBy');
    res.status(201).json({ document: serializeDocument(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload document', error: error.message });
  }
};

// @route  GET /api/documents
// @desc   List documents the logged-in user owns or that are shared
exports.listDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ uploadedBy: req.user._id }, { shared: true }]
    })
      .populate('uploadedBy')
      .sort({ createdAt: -1 });

    res.json({ documents: docs.map(serializeDocument) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents', error: error.message });
  }
};

// @route  GET /api/documents/:id/download
// @desc   Download/stream the actual file
exports.downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.uploadedBy.toString() !== req.user._id.toString() && !doc.shared) {
      return res.status(403).json({ message: 'You do not have access to this document' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File missing from storage' });
    }

    res.download(filePath, doc.name);
  } catch (error) {
    res.status(500).json({ message: 'Failed to download document', error: error.message });
  }
};

// @route  DELETE /api/documents/:id
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own documents' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', doc.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await doc.deleteOne();
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
};

// @route  POST /api/documents/:id/sign
// @desc   Simple e-signature: records the logged-in user's typed full name as their signature
exports.signDocument = async (req, res) => {
  try {
    const { signatureText } = req.body;
    if (!signatureText?.trim()) {
      return res.status(400).json({ message: 'signatureText is required' });
    }

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (doc.uploadedBy.toString() !== req.user._id.toString() && !doc.shared) {
      return res.status(403).json({ message: 'You do not have access to this document' });
    }

    doc.signature = {
      signedBy: req.user._id,
      signedByName: req.user.name,
      signatureText: signatureText.trim(),
      signedAt: new Date()
    };
    await doc.save();

    const populated = await doc.populate('uploadedBy');
    res.json({ document: serializeDocument(populated) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to sign document', error: error.message });
  }
};
