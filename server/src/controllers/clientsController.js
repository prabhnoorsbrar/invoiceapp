import mongoose from "mongoose";
import Client from "../models/Client.js";
import Invoice from "../models/Invoice.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  //console.log("🔍 req.user = ", req.user);
  const { companyId } = req.user;
  const rows = await Client.find({ companyId, active: true }).sort({ name: 1 }).lean();
  res.json(rows);
});


export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { name, emailTo = [], cc = [], address, paymentTermsDays = 30, showDueDate = true } = req.body;
  const row = await Client.create({ companyId, name, emailTo, cc, address, paymentTermsDays, showDueDate });
  res.json(row);
});

export const remove = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const client = await Client.findOne({ _id: req.params.id, companyId });
  if (!client) return res.status(404).json({ error: "Not found" });
  client.active = false;
  await client.save();
  res.json({ ok: true });
});

// GET /api/clients/stats — returns { [clientId]: { totalCents, outstandingCents, invoiceCount, avgDaysToPay } }
export const stats = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const rows = await Invoice.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    { $group: {
      _id: "$clientId",
      totalCents: { $sum: "$amountCents" },
      outstandingCents: { $sum: { $cond: [{ $eq: ["$status", "outstanding"] }, "$amountCents", 0] } },
      invoiceCount: { $sum: 1 },
      paidDaysSum: { $sum: { $cond: [
        { $and: [{ $eq: ["$status", "paid"] }, { $gt: ["$paidDate", null] }] },
        { $divide: [{ $subtract: ["$paidDate", "$invoiceDate"] }, 86400000] },
        0,
      ]}},
      paidCount: { $sum: { $cond: [
        { $and: [{ $eq: ["$status", "paid"] }, { $gt: ["$paidDate", null] }] },
        1, 0,
      ]}},
    }},
  ]);
  const map = {};
  for (const r of rows) {
    const avgDaysToPay = r.paidCount > 0 ? Math.round(r.paidDaysSum / r.paidCount) : null;
    map[String(r._id)] = { totalCents: r.totalCents, outstandingCents: r.outstandingCents, invoiceCount: r.invoiceCount, avgDaysToPay };
  }
  res.json(map);
});

export const update = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const client = await Client.findOne({ _id: req.params.id, companyId });
  if (!client) return res.status(404).json({ error: "Not found" });
  const { name, emailTo, cc, address, paymentTermsDays, showDueDate } = req.body;
  if (name !== undefined) client.name = name;
  if (emailTo !== undefined) client.emailTo = emailTo;
  if (cc !== undefined) client.cc = cc;
  if (address !== undefined) client.address = address;
  if (paymentTermsDays !== undefined) client.paymentTermsDays = paymentTermsDays;
  if (showDueDate !== undefined) client.showDueDate = showDueDate;
  await client.save();
  res.json(client);
});
