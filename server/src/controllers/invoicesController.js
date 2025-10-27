// server/src/controllers/invoicesController.js
import mongoose from 'mongoose'
import Client from '../models/Client.js'
import Route from '../models/Route.js'
import Invoice from '../models/Invoice.js'
import { asyncHandler } from '../utils/errors.js'

// --- helpers ---
function nextInvoiceNumber() {
  // Simple: UPL-YYYYMM-<random4>. Replace with a sequence if needed.
  const yymm = new Date().toISOString().slice(0, 7).replace('-', '')
  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `UPL-${yymm}-${rnd}`
}

function computeDueDate(invoiceDate, terms) {
  const d = new Date(invoiceDate)
  d.setDate(d.getDate() + (terms || 30))
  return d
}

function latestPrice(prices = [], at = new Date()) {
  const ts = prices
    .filter(
      (p) =>
        new Date(p.effectiveFrom) <= at &&
        (!p.effectiveTo || new Date(p.effectiveTo) >= at)
    )
    .sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))
  return ts[0]?.amountCents
}

// --- controllers ---

// POST /api/invoices
export const create = asyncHandler(async (req, res) => {
  const { companyId, uid } = req.user
  const {
    clientId,
    routeId,
    description,
    amountCents,
    invoiceDate,
    loadRef,
    status = 'outstanding',
    invoiceNumber,
  } = req.body

  const client = await Client.findOne({ _id: clientId, companyId })
  if (!client) return res.status(400).json({ error: 'Invalid client' })

  const invDate = new Date(invoiceDate)
  let amt = amountCents
  let desc = description

  if (routeId) {
    const route = await Route.findOne({ _id: routeId, companyId })
    if (!route) return res.status(400).json({ error: 'Invalid route' })
    const presetAmt = latestPrice(route.prices, invDate)
    if (!amt) amt = presetAmt
    if (!desc) desc = route.descriptionTemplate || route.name
  }

  if (!amt || !desc)
    return res
      .status(400)
      .json({ error: 'description and amountCents required' })

  const invNum = invoiceNumber || nextInvoiceNumber()
  const dueDate = computeDueDate(invDate, client.paymentTermsDays)

  const row = await Invoice.create({
    companyId,
    clientId,
    routeId: routeId || undefined,
    invoiceNumber: invNum,
    loadRef,
    description: desc,
    amountCents: amt,
    invoiceDate: invDate,
    dueDate,
    status,
    createdBy: uid,
  })

  res.json(row)
})

// GET /api/invoices/outstanding
export const listOutstanding = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const rows = await Invoice.find({
    companyId,
    status: 'outstanding',
  }).sort({ invoiceDate: 1 })
  res.json(rows)
})

// GET /api/invoices/search?q=...
export const search = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const { q = '' } = req.query
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const rows = await Invoice.find({
    companyId,
    $or: [{ invoiceNumber: re }, { loadRef: re }, { description: re }],
  })
    .sort({ invoiceDate: -1 })
    .limit(200)
  res.json(rows)
})

// POST /api/invoices/:id/mark-paid
export const markPaid = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const { id } = req.params
  const { paidDate, paymentMethod, paymentRef } = req.body

  const row = await Invoice.findOneAndUpdate(
    { _id: id, companyId },
    {
      status: 'paid',
      paidDate: new Date(paidDate),
      paymentMethod,
      paymentRef,
    },
    { new: true }
  )
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

// POST /api/invoices/:id/reopen
export const reopen = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const { id } = req.params

  const row = await Invoice.findOneAndUpdate(
    { _id: id, companyId },
    {
      status: 'outstanding',
      paidDate: null,
      paymentMethod: null,
      paymentRef: null,
    },
    { new: true }
  )
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})
export const remove = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { id } = req.params;

  const deleted = await Invoice.findOneAndDelete({ _id: id, companyId });
  if (!deleted) return res.status(404).json({ error: "Invoice not found or unauthorized" });

  res.json({ success: true });
});

// GET /api/invoices/kpis
export const kpis = asyncHandler(async (req, res) => {
  const { companyId } = req.user
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1)

  const [outstandingAgg] = await Invoice.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'outstanding',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amountCents' },
        count: { $sum: 1 },
      },
    },
  ])

  const [ytdAgg] = await Invoice.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(companyId),
        status: 'paid',
        paidDate: { $gte: yearStart, $lt: yearEnd },
      },
    },
    { $group: { _id: null, total: { $sum: '$amountCents' } } },
  ])

  res.json({
    outstandingTotalCents: outstandingAgg?.total || 0,
    outstandingCount: outstandingAgg?.count || 0,
    ytdIncomeCents: ytdAgg?.total || 0,
  })
})
