import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import { list, create } from "../controllers/clientsController.js";
const r = Router();
r.use(requireAuth);
r.get("/", list);
r.post("/", requireRole("admin", "finance"), create);
export default r;
