    import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

function DoctorLayout({
  children,
  title = "Doctor Dashboard",
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">

      {/* Sidebar */}
      <Sidebar role="doctor" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">

        {/* Navbar */}
        <Navbar title={title} />

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>

      </div>

    </div>
  );
}

export default DoctorLayout;