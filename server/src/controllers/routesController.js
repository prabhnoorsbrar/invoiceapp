import Route from "../models/Route.js";
import { asyncHandler } from "../utils/errors.js";

export const listByClient = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { clientId } = req.params;
  const rows = await Route.find({ companyId, clientId, active: true }).sort({
    name: 1,
  });
  res.json(rows);
});

export const createPreset = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const {
    clientId,
    name,
    descriptionTemplate,
    pickupCity,
    deliveryCity,
    baseAmountCents,
    effectiveFrom,
  } = req.body;
  const row = await Route.create({
    companyId,
    clientId,
    name,
    descriptionTemplate,
    pickupCity,
    deliveryCity,
    prices: [
      {
        amountCents: baseAmountCents,
        effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      },
    ],
  });
  res.json(row);
});

export const updatePrice = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { routeId } = req.params;
  const { newAmountCents, effectiveFrom } = req.body;
  const route = await Route.findOne({ _id: routeId, companyId });
  if (!route) return res.status(404).json({ error: "Not found" });
  route.prices.push({
    amountCents: newAmountCents,
    effectiveFrom: new Date(effectiveFrom || Date.now()),
  });
  await route.save();
  res.json(route);
});
