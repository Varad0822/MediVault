function Loader({
  text = "Loading...",
  fullScreen = false,
}) {
  const containerClass = fullScreen
    ? "fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50"
    : "flex items-center justify-center py-10";

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">

        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>

        {/* Loading Text */}
        <p className="text-gray-600 font-medium">
          {text}
        </p>

      </div>
    </div>
  );
}

export default Loader;