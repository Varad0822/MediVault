import { useEffect, useState } from "react";
import { Calendar, Clock, Stethoscope, Building2, CheckCircle2, XCircle, AlertCircle, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

import PatientLayout from "../../layouts/PatientLayout";
import PageHeader from "../../components/common/PageHeader";
import Loader from "../../components/common/Loader";
import EmptyState from "../../components/common/EmptyState";
import appointmentService from "../../services/appointmentService";

function MyAppointments() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  async function loadAppointments() {
    try {
      setLoading(true);
      const data = await appointmentService.getPatientAppointments();
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this appointment request?")) {
      return;
    }

    try {
      await appointmentService.updateAppointmentStatus(id, "cancelled");
      setToast({ type: "success", text: "Appointment cancelled." });
      await loadAppointments();
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      console.error(err);
      setToast({ type: "error", text: err.message });
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (activeFilter === "all") return true;
    return app.status === activeFilter;
  });

  if (loading) {
    return <Loader fullScreen text="Fetching Your Appointments..." />;
  }

  return (
    <PatientLayout title="My Appointments">
      <div className="flex items-center justify-between mb-4">
        <PageHeader
          title="My Scheduled Appointments"
          subtitle="Track consultation requests, confirmed dates, and past appointment history."
        />
        <Link
          to="/book-appointment"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 shrink-0"
        >
          <PlusCircle size={16} /> Book New Appointment
        </Link>
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

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        {["all", "pending", "confirmed", "completed", "cancelled"].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`pb-3 px-3 text-xs font-extrabold capitalize transition border-b-2 ${
              activeFilter === filter
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
          >
            {filter} ({filter === "all" ? appointments.length : appointments.filter((a) => a.status === filter).length})
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description={activeFilter === "all" ? "You haven't booked any appointments yet." : `No ${activeFilter} appointments.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAppointments.map((app) => {
            const docDetails = Array.isArray(app.doctor?.details) ? app.doctor?.details[0] : app.doctor?.details;

            return (
              <div
                key={app.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={14} className="text-blue-600" />
                      {app.appointment_date} @ {app.appointment_time}
                    </span>

                    {/* Status Badge */}
                    {app.status === "pending" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Confirmation
                      </span>
                    )}
                    {app.status === "confirmed" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <CheckCircle2 size={13} /> Confirmed
                      </span>
                    )}
                    {app.status === "completed" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} /> Completed
                      </span>
                    )}
                    {app.status === "cancelled" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        <XCircle size={13} /> Cancelled
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-base mb-1">
                    Dr. {app.doctor?.full_name || "Physician"}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 mb-3 flex items-center gap-1">
                    <Stethoscope size={13} /> {docDetails?.specialization || "Doctor"} | {docDetails?.hospital_name || "Clinic"}
                  </p>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 mb-4">
                    <strong className="text-slate-900 block mb-0.5">Reason for Visit:</strong>
                    {app.reason}
                  </div>
                </div>

                {/* Cancel Action */}
                {(app.status === "pending" || app.status === "confirmed") && (
                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => handleCancel(app.id)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-semibold text-xs rounded-lg transition flex items-center gap-1"
                    >
                      <XCircle size={14} /> Cancel Appointment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PatientLayout>
  );
}

export default MyAppointments;
