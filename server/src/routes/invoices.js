import { Router } from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../utils/auth.js";
import { validate, schemas } from "../utils/validate.js";
import {
  create,
  listOutstanding,
  search,
  markPaid,
  reopen,
  kpis,
  remove,
  lastNumber,
  update,
} from "../controllers/invoicesController.js";
import { sendInvoiceEmail } from "../controllers/emailController.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const r = Router();
r.use(requireAuth);
r.get("/kpis", kpis);
r.get("/last-number", lastNumber);
r.get("/outstanding", listOutstanding);
r.get("/search", search);
r.post("/", requireRole("admin", "finance"), validate(schemas.createInvoice), create);
r.post("/:id/mark-paid", requireRole("admin", "finance"), validate(schemas.markPaid), markPaid);
r.post("/:id/reopen", requireRole("admin", "finance"), reopen);
r.patch("/:id", requireRole("admin", "finance"), validate(schemas.updateInvoice), update);
r.post("/:id/email", requireRole("admin", "finance"), upload.array("attachments", 10), sendInvoiceEmail);
r.delete("/:id", requireRole("admin"), remove);
export default r;
