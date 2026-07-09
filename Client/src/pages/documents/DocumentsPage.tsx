import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, Trash2, Share2, PenLine, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface DocumentItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  shared: boolean;
  uploadedBy: { id: string; name: string } | string;
  signature: { signedByName: string; signatureText: string; signedAt: string } | null;
  createdAt: string;
  downloadUrl: string;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileTypeLabel = (mimeType: string) => {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType.includes('word')) return 'Document';
  if (mimeType.startsWith('image/')) return 'Image';
  return 'File';
};

export const DocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [signingDocId, setSigningDocId] = useState<string | null>(null);
  const [signatureText, setSignatureText] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = () => {
    api.listDocuments()
      .then(({ documents }) => setDocuments(documents))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      await api.uploadDocument(file, false);
      loadDocuments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleSign = async (id: string) => {
    if (!signatureText.trim()) return;
    const { document } = await api.signDocument(id, signatureText);
    setDocuments(prev => prev.map(d => (d.id === id ? document : d)));
    setSigningDocId(null);
    setSignatureText('');
  };

  const ownedDocs = documents.filter(d => (typeof d.uploadedBy === 'object' ? d.uploadedBy.id : d.uploadedBy) === user?.id);
  const totalSize = ownedDocs.reduce((sum, d) => sum + d.size, 0);
  const visibleDocuments = showSharedOnly ? documents.filter(d => d.shared) : documents;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />
          <Button leftIcon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-error-50 text-error-700 text-sm px-4 py-3 rounded-md">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Storage info — real numbers, not a fake quota */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Your Storage</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Files uploaded</span>
                <span className="font-medium text-gray-900">{ownedDocs.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total size</span>
                <span className="font-medium text-gray-900">{formatBytes(totalSize)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Access</h3>
              <button
                onClick={() => setShowSharedOnly(false)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md ${!showSharedOnly ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                All Files
              </button>
              <button
                onClick={() => setShowSharedOnly(true)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md ${showSharedOnly ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                Shared with Me
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">
                {showSharedOnly ? 'Shared Documents' : 'All Documents'}
              </h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <p className="text-center py-8 text-gray-500">Loading...</p>
              ) : visibleDocuments.length === 0 ? (
                <p className="text-center py-8 text-gray-500">No documents yet.</p>
              ) : (
                <div className="space-y-2">
                  {visibleDocuments.map(doc => {
                    const isOwner = (typeof doc.uploadedBy === 'object' ? doc.uploadedBy.id : doc.uploadedBy) === user?.id;
                    return (
                      <div key={doc.id} className="p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                        <div className="flex items-center">
                          <div className="p-2 bg-primary-50 rounded-lg mr-4">
                            <FileText size={24} className="text-primary-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                              {doc.shared && <Badge variant="secondary" size="sm">Shared</Badge>}
                              {doc.signature && <Badge variant="success" size="sm">Signed</Badge>}
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span>{fileTypeLabel(doc.mimeType)}</span>
                              <span>{formatBytes(doc.size)}</span>
                              <span>Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <a href={api.downloadDocumentUrl(doc.id)} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
                                <Download size={18} />
                              </Button>
                            </a>

                            {!doc.signature && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2"
                                aria-label="Sign"
                                onClick={() => setSigningDocId(signingDocId === doc.id ? null : doc.id)}
                              >
                                <PenLine size={18} />
                              </Button>
                            )}

                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 text-error-600 hover:text-error-700"
                                aria-label="Delete"
                                onClick={() => handleDelete(doc.id)}
                              >
                                <Trash2 size={18} />
                              </Button>
                            )}
                          </div>
                        </div>

                        {doc.signature && (
                          <p className="text-xs text-gray-500 mt-2 ml-14">
                            Signed by {doc.signature.signedByName} ("{doc.signature.signatureText}") on{' '}
                            {new Date(doc.signature.signedAt).toLocaleDateString()}
                          </p>
                        )}

                        {signingDocId === doc.id && (
                          <div className="mt-3 ml-14 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Type your full name to sign"
                              value={signatureText}
                              onChange={(e) => setSignatureText(e.target.value)}
                              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm flex-1"
                            />
                            <Button size="sm" onClick={() => handleSign(doc.id)}>Sign</Button>
                            <button onClick={() => setSigningDocId(null)} className="text-gray-400 hover:text-gray-600">
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
