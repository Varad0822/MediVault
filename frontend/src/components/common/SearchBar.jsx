import { Search, X } from "lucide-react";

function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
}) {
  return (
    <div className="relative w-full">

      {/* Search Icon */}
      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
      />

      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-3 rounded-xl border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition"
        >
          <X size={18} />
        </button>
      )}

    </div>
  );
}

export default SearchBar;