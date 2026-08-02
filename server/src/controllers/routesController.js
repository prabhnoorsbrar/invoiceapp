import Route from "../models/Route.js";
import { asyncHandler } from "../utils/errors.js";

export const listByClient = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { clientId } = req.params;
  const rows = await Route.find({ companyId, clientId, active: true }).sort({ name: 1 }).lean();
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
  try {
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
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `A route named "${name}" already exists for this client` });
    }
    throw err;
  }
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

export const updateRoute = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { routeId } = req.params;
  const route = await Route.findOne({ _id: routeId, companyId });
  if (!route) return res.status(404).json({ error: "Not found" });
  const { name, descriptionTemplate, pickupCity, deliveryCity, active } = req.body;
  if (name !== undefined) route.name = name;
  if (descriptionTemplate !== undefined) route.descriptionTemplate = descriptionTemplate;
  if (pickupCity !== undefined) route.pickupCity = pickupCity;
  if (deliveryCity !== undefined) route.deliveryCity = deliveryCity;
  if (active !== undefined) route.active = active;
  try {
    await route.save();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: `A route named "${route.name}" already exists for this client` });
    }
    throw err;
  }
  res.json(route);
});

// DELETE /api/routes/:routeId — soft delete (matches client "remove")
export const archiveRoute = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const { routeId } = req.params;
  const route = await Route.findOne({ _id: routeId, companyId });
  if (!route) return res.status(404).json({ error: "Not found" });
  route.active = false;
  await route.save();
  res.json({ ok: true });
});
