import Client from "../models/Client.js";
import { asyncHandler } from "../utils/errors.js";

export const list = asyncHandler(async (req, res) => {
  //console.log("🔍 req.user = ", req.user);
  const { companyId } = req.user;
  const rows = await Client.find({ companyId, active: true }).sort({ name: 1 });
  res.json(rows);
});


export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { name, emailTo = [], address, paymentTermsDays = 30 } = req.body;
  const row = await Client.create({
    companyId,
    name,
    emailTo,
    address,
    paymentTermsDays,
  });
  res.json(row);
});
