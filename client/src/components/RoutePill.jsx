export default function RoutePill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-sm transition
      ${active ? "bg-primary text-primary-content border-primary" : "bg-base-100 border-base-200 hover:bg-base-200"}`}
    >
      {label}
    </button>
  );
}

