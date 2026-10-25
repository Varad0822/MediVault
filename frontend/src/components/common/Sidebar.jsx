import {
  LayoutDashboard,
  User,
  FileText,
  ShieldCheck,
  Pill,
  LogOut,
  HeartPulse,
  Stethoscope,
  ChevronRight,
  Calendar,
  CalendarPlus,
  FolderOpen,
  Activity,
  Sparkles,
  Users
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function Sidebar({ role = "patient" }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const patientLinks = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/patient-dashboard",
    },
    {
      name: "Analyze Past Record",
      icon: <Sparkles size={20} />,
      path: "/upload-past-record",
    },
    {
      name: "Vitals Tracker",
      icon: <Activity size={20} />,
      path: "/vitals-tracker",
    },
    {
      name: "Book Appointment",
      icon: <CalendarPlus size={20} />,
      path: "/book-appointment",
    },
    {
      name: "My Appointments",
      icon: <Calendar size={20} />,
      path: "/my-appointments",
    },
    {
      name: "Lab Reports & Files",
      icon: <FolderOpen size={20} />,
      path: "/lab-reports",
    },
    {
      name: "My Profile",
      icon: <User size={20} />,
      path: "/patient-profile",
    },
    {
      name: "Medical History",
      icon: <FileText size={20} />,
      path: "/medical-history",
    },
    {
      name: "Prescriptions",
      icon: <Pill size={20} />,
      path: "/prescriptions",
    },
    {
      name: "Generate Access OTP",
      icon: <ShieldCheck size={20} />,
      path: "/generate-access",
    },
  ];

  const doctorLinks = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/doctor-dashboard",
    },
    {
      name: "Visited Patient Records",
      icon: <Users size={20} />,
      path: "/doctor-visited-patients",
    },
    {
      name: "Doctor Profile",
      icon: <User size={20} />,
      path: "/doctor-profile",
    },
    {
      name: "Appointments Agenda",
      icon: <Calendar size={20} />,
      path: "/doctor-appointments",
    },
    {
      name: "Patient Access Verification",
      icon: <ShieldCheck size={20} />,
      path: "/doctor-access",
    },
    {
      name: "Add Medical Record",
      icon: <FileText size={20} />,
      path: "/add-record",
    },
    {
      name: "Add Prescription",
      icon: <Pill size={20} />,
      path: "/add-prescription",
    },
  ];

  const links = role === "doctor" ? doctorLinks : patientLinks;

  return (
    <aside className="w-72 min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-2xl relative z-20">
      <div>
        {/* Logo & Brand Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            {role === "doctor" ? <Stethoscope size={24} /> : <HeartPulse size={24} />}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              MediVault
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              {role} Portal
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="p-4 space-y-1.5">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Main Menu
          </p>

          {links.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 font-medium text-sm ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>
              <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-600/20 hover:border-rose-600 transition-all duration-200 rounded-xl py-2.5 text-sm font-semibold shadow-sm"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;