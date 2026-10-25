import { Bell, CalendarDays, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function Navbar({ title = "Dashboard" }) {
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const getProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserName(data.full_name || user.email);
        setUserRole(data.role);
      }
    };

    getProfile();
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 sticky top-0 z-10 flex items-center justify-between shadow-xs">
      {/* Title & Date */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
          <CalendarDays size={14} className="text-blue-600" />
          <span>{today}</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-5">
        {/* Security Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
          <ShieldCheck size={14} />
          <span>HIPAA Encrypted</span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          aria-label="View notifications"
          className="relative p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
        </button>

        {/* User Card */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/20 text-base">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <h2 className="text-sm font-bold text-slate-800 leading-tight">
              {userName}
            </h2>
            <p className="text-xs text-slate-500 capitalize">
              {userRole ? `${userRole} Account` : "Active User"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;