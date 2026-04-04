import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import {
  listByClient,
  createPreset,
  updatePrice,
} from "../controllers/routesController.js";
const r = Router();
r.use(requireAuth);
r.get("/:clientId", listByClient);
r.post("/", requireRole("admin", "finance"), createPreset);
r.post("/:routeId/price", requireRole("admin", "finance"), updatePrice);
export default r;
