import Client from "../models/Client.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  //console.log("🔍 req.user = ", req.user);
  const { companyId } = req.user;
  const rows = await Client.find({ companyId, active: true }).sort({ name: 1 }).lean();
  res.json(rows);
});


export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { name, emailTo = [], cc = [], address, paymentTermsDays = 30 } = req.body;
  const row = await Client.create({ companyId, name, emailTo, cc, address, paymentTermsDays });
  res.json(row);
});

export const update = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const client = await Client.findOne({ _id: req.params.id, companyId });
  if (!client) return res.status(404).json({ error: "Not found" });
  const { name, emailTo, cc, address, paymentTermsDays } = req.body;
  if (name !== undefined) client.name = name;
  if (emailTo !== undefined) client.emailTo = emailTo;
  if (cc !== undefined) client.cc = cc;
  if (address !== undefined) client.address = address;
  if (paymentTermsDays !== undefined) client.paymentTermsDays = paymentTermsDays;
  await client.save();
  res.json(client);
});
