import { Router } from "express";
import { requireAuth } from "../utils/auth.js";
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
r.post("/", create);
r.post("/:id/mark-paid", markPaid);
r.post("/:id/reopen", reopen);
r.delete("/:id", requireAuth, remove);
export default r;
