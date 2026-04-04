import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import { validate, schemas } from "../utils/validate.js";
import {
  listByClient,
  createPreset,
  updatePrice,
} from "../controllers/routesController.js";
const r = Router();
r.use(requireAuth);
r.get("/:clientId", listByClient);
r.post("/", requireRole("admin", "finance"), validate(schemas.createRoute), createPreset);
r.post("/:routeId/price", requireRole("admin", "finance"), validate(schemas.updatePrice), updatePrice);
export default r;
