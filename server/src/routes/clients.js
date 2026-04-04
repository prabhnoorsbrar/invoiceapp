import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import { validate, schemas } from "../utils/validate.js";
import { list, create } from "../controllers/clientsController.js";
const r = Router();
r.use(requireAuth);
r.get("/", list);
r.post("/", requireRole("admin", "finance"), validate(schemas.createClient), create);
export default r;
