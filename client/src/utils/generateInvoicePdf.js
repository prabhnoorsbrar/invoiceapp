import { jsPDF } from "jspdf";

const brandBlue = { r: 26, g: 88, b: 168 };
const paleBlue = { r: 232, g: 241, b: 252 };

function currency(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDate(iso) {
  if (!iso) return null;
  const parts = String(iso).slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function parseAddress(addressStr) {
  if (!addressStr) return { street: "", cityStateZip: "" };
  const cleaned = addressStr.replace(/\s+,/g, ",").trim();
  const lines = cleaned.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  let street = "", cityStateZip = "";
  if (lines.length >= 2) {
    street = lines[0];
    cityStateZip = lines[1];
  } else {
    const [, s1 = "", s2 = ""] = cleaned.match(/^([^,]+),(.*)$/) || [];
    if (s2) { street = s1.trim(); cityStateZip = s2.trim().replace(/^,/, "").trim(); }
    else { street = cleaned; }
  }
  const m = cityStateZip.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (m) { const [, city, st, zip] = m; cityStateZip = `${city.trim()}, ${st} ${zip}`; }
  return { street, cityStateZip };
}

export function generateInvoicePdf({ invoice, client, company, user }) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const usableWidth = pageWidth - marginLeft - marginRight;
  let y = 22;

  // Top accent bar
  pdf.setFillColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.rect(0, 0, pageWidth, 6, "F");

  // Business info
  const businessName =
    (company?.name && company.name.trim()) ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Company";
  const addressStr = company?.address?.trim() || user?.address?.trim() || "";
  const { street, cityStateZip } = parseAddress(addressStr);
  const phone = user?.phone?.trim() || company?.phone?.trim() || "";
  const contactName = [user?.firstName, user?.lastName].map((p) => p?.trim()).filter(Boolean).join(" ");

  const invoiceNumber = invoice?.invoiceNumber ? String(invoice.invoiceNumber).trim() : "";
  const formattedInvoiceDate = formatDate(invoice?.invoiceDate);
  const loadRef = invoice?.loadRef?.trim() || "";

  // Line items
  const lineItems = Array.isArray(invoice?.lineItems) && invoice.lineItems.length
    ? invoice.lineItems
    : [{ description: invoice?.description || "", amountCents: invoice?.amountCents ?? null, isPrimary: true }];

  const totalCents = typeof invoice?.amountCents === "number" ? invoice.amountCents
    : lineItems.reduce((s, i) => s + (typeof i.amountCents === "number" ? i.amountCents : 0), 0);

  const addLabelValue = (label, value, x, yPos, options = {}) => {
    const { bold = false, skipWhenEmpty = false } = options;
    if (skipWhenEmpty && !value) return yPos;
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text(label, x, yPos);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.text(value || "—", x, yPos + 5);
    pdf.setFont("helvetica", "normal");
    return yPos + 10;
  };

  // Header
  pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(businessName, marginLeft, y + 2);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0);
  if (street) pdf.text(street, marginLeft, y + 8);
  if (cityStateZip) pdf.text(cityStateZip, marginLeft, y + 13);
  if (phone) pdf.text(phone, marginLeft, y + 18);
  y += 26;

  // Separator line
  pdf.setDrawColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.setLineWidth(0.4);
  pdf.line(marginLeft, y, pageWidth - marginRight, y);
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(200, 200, 200);
  y += 6;

  // INVOICE title
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.text("INVOICE", pageWidth - marginRight - 40, 26);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");

  // Invoice meta
  const col1X = marginLeft;
  const col2X = marginLeft + usableWidth / 2 + 2;
  const metaStartY = y;

  const dueDate = (() => {
    if (formattedInvoiceDate && client?.paymentTermsDays) {
      const dt = new Date(invoice?.invoiceDate);
      if (!isNaN(dt)) {
        dt.setDate(dt.getDate() + Number(client.paymentTermsDays));
        return formatDate(dt.toISOString().slice(0, 10));
      }
    }
    return null;
  })();

  let leftY = y;
  leftY = addLabelValue("Invoice No:", invoiceNumber, col1X, leftY, { bold: true, skipWhenEmpty: true });
  leftY = addLabelValue("Invoice date:", formattedInvoiceDate, col1X, leftY, { skipWhenEmpty: true });
  leftY = addLabelValue("Load reference:", loadRef, col1X, leftY, { skipWhenEmpty: true });

  let rightY = y;
  rightY = addLabelValue("Due date:", dueDate, col2X, rightY, { skipWhenEmpty: true });
  rightY = addLabelValue("Payment terms:", client?.paymentTermsDays ? `Net ${client.paymentTermsDays}` : null, col2X, rightY, { skipWhenEmpty: true });
  rightY = addLabelValue("Delivery date:", formattedInvoiceDate, col2X, rightY, { skipWhenEmpty: true });

  y = Math.max(leftY, rightY) + 8;

  // Bill To box
  const addressLines = (client?.address || "").split(/\r?\n/).filter(Boolean);
  const lines = [client?.name || "Client", ...addressLines];
  const boxHeight = 10 + lines.length * 5 + 4;
  pdf.setFillColor(paleBlue.r, paleBlue.g, paleBlue.b);
  pdf.roundedRect(marginLeft, y, usableWidth / 2, boxHeight, 2, 2, "F");
  pdf.setFillColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.roundedRect(marginLeft, y, 3, boxHeight, 1, 1, "F");
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.text("BILL TO", marginLeft + 6, y + 6);
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  lines.forEach((line, idx) => pdf.text(line, marginLeft + 6, y + 12 + idx * 5));
  y += boxHeight + 6;

  // Table
  y += 4;
  const descWidth = usableWidth * 0.56;
  const qtyWidth = usableWidth * 0.12;
  const unitWidth = usableWidth * 0.16;
  const headerY = y;

  pdf.setFillColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.roundedRect(marginLeft, headerY - 6, usableWidth, 10, 1, 1, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text("DESCRIPTION", marginLeft + 3, headerY);
  pdf.text("QUANTITY", marginLeft + descWidth + 4, headerY, { align: "right" });
  pdf.text("UNIT PRICE", marginLeft + descWidth + qtyWidth + 8, headerY, { align: "right" });
  pdf.text("AMOUNT", marginLeft + descWidth + qtyWidth + unitWidth + 12, headerY, { align: "right" });
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
  pdf.setDrawColor(230, 230, 230);

  let rowY = headerY + 8;
  lineItems.forEach((item) => {
    const amount = typeof item.amountCents === "number" && Number.isFinite(item.amountCents) ? item.amountCents : 0;
    const desc = item.description || (item.isPrimary ? "Freight charges" : "");
    if (!desc && !amount) return;
    const wrappedDesc = pdf.splitTextToSize(desc, descWidth - 2);
    const height = Math.max(8, wrappedDesc.length * 5);
    pdf.text(wrappedDesc, marginLeft, rowY);
    pdf.text("1", marginLeft + descWidth + 4, rowY, { align: "right" });
    pdf.text(currency(amount), marginLeft + descWidth + qtyWidth + 8, rowY, { align: "right" });
    pdf.text(currency(amount), marginLeft + descWidth + qtyWidth + unitWidth + 12, rowY, { align: "right" });
    rowY += height + 4;
    pdf.setDrawColor(240, 240, 240);
    pdf.line(marginLeft, rowY - 2, marginLeft + usableWidth, rowY - 2);
  });

  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.text("TOTAL", marginLeft + descWidth + qtyWidth + unitWidth + 12, rowY + 6, { align: "right" });
  pdf.text(currency(totalCents), marginLeft + descWidth + qtyWidth + unitWidth + 12, rowY + 12, { align: "right" });
  pdf.setTextColor(0);
  y = rowY + 20;

  // Footer
  pdf.setFillColor(paleBlue.r, paleBlue.g, paleBlue.b);
  pdf.roundedRect(marginLeft, y - 6, usableWidth, 20, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(brandBlue.r, brandBlue.g, brandBlue.b);
  pdf.text("TOTAL DUE", marginLeft + 4, y);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0);
  pdf.text(currency(totalCents), marginLeft + 60, y);
  pdf.setFontSize(8);
  pdf.text("Make payments to", marginLeft + 4, y + 6);
  pdf.text(businessName, marginLeft + 32, y + 6);
  const contactLine = [contactName, phone].filter(Boolean).join(" @ ");
  if (contactLine) pdf.text(`Contact: ${contactLine}`, marginLeft + 4, y + 12);

  // Download
  const filename = invoiceNumber ? `Invoice ${invoiceNumber}.pdf` : "Invoice.pdf";
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
}
