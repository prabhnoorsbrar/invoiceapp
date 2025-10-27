export default function ClientBubble({ client, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left rounded-2xl border transition shadow-sm p-4 hover:shadow-md 
      ${active ? "border-primary ring-2 ring-primary/20" : "border-base-200 bg-base-100"}`}
    >
      <div className="min-w-0">
        <div className="font-semibold truncate">{client.name}</div>
        {client.address && (
          <div className="text-xs text-base-content/60 truncate">{client.address}</div>
        )}
      </div>
    </button>
  );
}
