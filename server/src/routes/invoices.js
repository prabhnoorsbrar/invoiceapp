import { Router } from "express";
import { requireAuth, requireRole } from "../utils/auth.js";
import {
  create,
  listOutstanding,
  search,
  markPaid,
  reopen,
  kpis,
  remove
} from "../controllers/invoicesController.js";
const r = Router();
r.use(requireAuth);
r.get("/kpis", kpis);
r.get("/outstanding", listOutstanding);
r.get("/search", search);
r.post("/", requireRole("admin", "finance"), create);
r.post("/:id/mark-paid", requireRole("admin", "finance"), markPaid);
r.post("/:id/reopen", requireRole("admin", "finance"), reopen);
r.delete("/:id", requireRole("admin"), remove);
export default r;
