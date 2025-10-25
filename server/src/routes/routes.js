import { Router } from "express";
import { requireAuth } from "../utils/auth.js";
import {
  listByClient,
  createPreset,
  updatePrice,
} from "../controllers/routesController.js";
const r = Router();
r.use(requireAuth);
r.get("/:clientId", listByClient);
r.post("/", createPreset);
r.post("/:routeId/price", updatePrice);
export default r;
