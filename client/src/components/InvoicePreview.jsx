import React from "react";
import { generateInvoicePdf } from "../utils/generateInvoicePdf";

export default function InvoicePreview({ company, user, client, invoice }) {
  const previewRef = React.useRef(null);
  const currency = (valueInCents) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((valueInCents ?? 0) / 100);

  const formatDate = (iso) => {
    if (!iso) return null;
    const parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3) return null;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  const parseAddress = (addressStr) => {
    if (!addressStr) return { street: "", cityStateZip: "" };
    const cleaned = addressStr.replace(/\s+,/g, ",").trim();
    const lines = cleaned.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    let street = "", cityStateZip = "";
    if (lines.length >= 2) {
      street = lines[0]; cityStateZip = lines[1];
    } else {
      const [, s1 = "", s2 = ""] = cleaned.match(/^([^,]+),(.*)$/) || [];
      if (s2) { street = s1.trim(); cityStateZip = s2.trim().replace(/^,/, "").trim(); }
      else { street = cleaned; }
    }
    const m = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (m) { const [, city, st, zip] = m; cityStateZip = `${city.trim()}, ${st} ${zip}`; }
    return { street, cityStateZip };
  };

  const businessName =
    (company?.name && company.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Company name";

  const addressStr = company?.address?.trim() || user?.address?.trim() || "";
  const { street, cityStateZip } = parseAddress(addressStr);
  const phone = user?.phone?.trim() || company?.phone?.trim() || "";
  const contactName = [user?.firstName, user?.lastName].map((p) => p?.trim()).filter(Boolean).join(" ");
  const invoiceNumber = invoice?.invoiceNumber ? String(invoice.invoiceNumber).trim() : "";
  const formattedInvoiceDate = formatDate(invoice?.invoiceDate);
  const loadRef = invoice?.loadRef?.trim() || "";
  const hasContactName = Boolean(contactName);
  const hasPhone = Boolean(phone);

  const invoiceLineItems = React.useMemo(() => {
    if (Array.isArray(invoice?.lineItems) && invoice.lineItems.length) {
      return invoice.lineItems.map((item, index) => ({
        id: item?.id || `line-${index}`,
        description: item?.description || "",
        amountCents: typeof item?.amountCents === "number" && Number.isFinite(item.amountCents) ? item.amountCents : null,
        isPrimary: item?.isPrimary ?? index === 0,
      }));
    }
    if (invoice?.description) {
      return [{ id: "primary", description: invoice.description, amountCents: typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents) ? invoice.amountCents : null, isPrimary: true }];
    }
    return [{ id: "primary", description: "", amountCents: typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents) ? invoice.amountCents : null, isPrimary: true }];
  }, [invoice]);

  const totalCents = React.useMemo(() => {
    if (typeof invoice?.amountCents === "number" && Number.isFinite(invoice.amountCents)) return invoice.amountCents;
    return invoiceLineItems.reduce((sum, item) => sum + (typeof item.amountCents === "number" ? item.amountCents : 0), 0);
  }, [invoice, invoiceLineItems]);

  const handleDownloadPdf = React.useCallback(() => {
    generateInvoicePdf({ invoice, client, company, user });
  }, [invoice, client, company, user]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-base-content/30">Preview</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">{businessName}</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/30 mb-0.5">Invoice</p>
              <p className="text-2xl font-extrabold text-base-content leading-none">
                {invoiceNumber ? `#${invoiceNumber}` : <span className="text-base-content/20">—</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/30 mb-0.5">Date</p>
              <p className="text-sm font-semibold text-base-content/70">
                {formattedInvoiceDate || <span className="text-base-content/20">—</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Bill To */}
          <div className="bg-white/[0.04] rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-base-content/30 mb-1">Bill To</p>
            <p className="text-sm font-bold text-base-content">
              {client?.name || <span className="text-base-content/20">—</span>}
            </p>
            {client?.address && (
              <p className="text-xs text-base-content/40 whitespace-pre-line mt-0.5">{client.address}</p>
            )}
            {client?.paymentTermsDays && (
              <p className="text-xs text-base-content/30 mt-1">Net {client.paymentTermsDays}</p>
            )}
          </div>

          {/* Load ref */}
          {loadRef && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-base-content/30">Ref</span>
              <span className="text-xs text-base-content/60 font-medium">{loadRef}</span>
            </div>
          )}

          {/* Line items */}
          <div>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-base-content/30 pb-2 border-b border-white/[0.06]">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="space-y-2 mt-2">
              {invoiceLineItems.map((item, index) => {
                const amount = typeof item.amountCents === "number" && Number.isFinite(item.amountCents) ? item.amountCents : 0;
                const hasDescription = Boolean(item.description);
                const hasAmount = amount > 0;
                if (!item.isPrimary && !hasDescription && !hasAmount) return null;
                return (
                  <div key={item.id || index} className="flex justify-between gap-3 text-sm">
                    <span className={`leading-snug ${hasDescription ? "text-base-content/80" : "text-base-content/20 italic"}`}>
                      {hasDescription ? item.description : "Describe the load…"}
                    </span>
                    <span className={`shrink-0 font-semibold tabular-nums ${hasAmount ? "text-primary" : "text-base-content/20"}`}>
                      {currency(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mx-5 mb-5 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-base-content/40">Total</span>
          <span className="text-xl font-extrabold text-primary">{currency(totalCents)}</span>
        </div>
      </div>

      <button
        onClick={handleDownloadPdf}
        className="mt-3 w-full py-3 rounded-2xl flex items-center justify-center gap-2 bg-primary/15 border border-primary/30 text-sm font-bold text-primary hover:bg-primary/25 hover:border-primary/50 active:bg-primary/35 transition-all duration-150 backdrop-blur-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PDF
      </button>
    </div>
  );
}
