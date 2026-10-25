import { useEffect, useState } from "react";
import { FileText, Upload, Download, Eye, Trash2, PlusCircle, CheckCircle2, X, AlertCircle, FilePlus, Image, FileCode } from "lucide-react";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import labReportService from "../../services/labReportService";

function LabReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Lab Report");
  const [selectedFile, setSelectedFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);

  // Preview Modal
  const [previewFile, setPreviewFile] = useState(null);

  const categories = ["Lab Report", "X-Ray / Scan", "Prescription Document", "Discharge Summary", "Other"];

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      setLoading(true);
      const data = await labReportService.getPatientLabReports();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) {
      setToast({ type: "error", text: "Please provide a document title and select a file." });
      return;
    }

    try {
      setUploading(true);
      await labReportService.createLabReport({
        title,
        category,
        file: selectedFile,
        notes,
      });

      setToast({ type: "success", text: "Medical document successfully uploaded!" });
      setShowUploadModal(false);
      setTitle("");
      setSelectedFile(null);
      setNotes("");
      await loadReports();

      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message || "Failed to upload file." });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lab report?")) {
      return;
    }

    try {
      await labReportService.deleteLabReport(id);
      setToast({ type: "success", text: "Report deleted." });
      await loadReports();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    }
  };

  const filteredReports = reports.filter((r) => {
    if (activeCategory === "all") return true;
    return r.category === activeCategory;
  });

  if (loading) {
    return <Loader fullScreen text="Loading Medical Document Repository..." />;
  }

  return (
    <PatientLayout title="Lab Reports & Files">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="Lab Reports & Health Files"
          subtitle="Upload, organize, and securely store blood reports, X-rays, discharge summaries, and medical PDFs."
        />
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 shrink-0"
        >
          <Upload size={16} /> Upload New Document
        </button>
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between text-sm font-semibold border ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveCategory("all")}
          className={`pb-3 px-3 text-xs font-extrabold transition border-b-2 ${
            activeCategory === "all"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          All Documents ({reports.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`pb-3 px-3 text-xs font-extrabold transition border-b-2 whitespace-nowrap ${
              activeCategory === cat
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {cat} ({reports.filter((r) => r.category === cat).length})
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title="No Medical Files Found"
          description={activeCategory === "all" ? "You haven't uploaded any medical reports yet." : `No documents under '${activeCategory}'.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const isImage = report.file_type?.startsWith("image/");

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {isImage ? <Image size={20} /> : <FileText size={20} />}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {report.category}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base mb-1 group-hover:text-blue-600 transition-colors">
                    {report.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono mb-3 truncate">
                    {report.file_name}
                  </p>

                  {report.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4 italic">
                      "{report.notes}"
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewFile(report)}
                      className="p-2 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white rounded-lg transition"
                      title="Preview Document"
                    >
                      <Eye size={15} />
                    </button>

                    <a
                      href={report.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="p-2 bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white rounded-lg transition"
                      title="Download File"
                    >
                      <Download size={15} />
                    </a>

                    <button
                      onClick={() => handleDelete(report.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition"
                      title="Delete Report"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <FilePlus size={22} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Upload Medical Document
                </h3>
                <p className="text-xs text-slate-500">
                  Supports PDF reports, JPEG/PNG lab scans, and medical files.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count (CBC) Test Result"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Category Type
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Select File (PDF, PNG, JPG)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  required
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                  Additional Medical Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Lab center name, physician notes, or health observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
                >
                  <Upload size={16} />
                  {uploading ? "Uploading to Storage..." : "Upload Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-extrabold text-slate-900 mb-1">{previewFile.title}</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">{previewFile.file_name}</p>

            <div className="bg-slate-900 rounded-xl p-2 min-h-[350px] flex items-center justify-center overflow-hidden">
              {previewFile.file_type?.startsWith("image/") ? (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.title}
                  className="max-h-[500px] object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={previewFile.file_url}
                  title={previewFile.title}
                  className="w-full h-[500px] rounded-lg bg-white"
                />
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold">Category: {previewFile.category}</span>
              <a
                href={previewFile.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Download size={14} /> Open / Download File
              </a>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}

export default LabReports;
