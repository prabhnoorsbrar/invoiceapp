import { Router } from "express";
import { requireAuth } from "../utils/auth.js";
import { list, create } from "../controllers/clientsController.js";
const r = Router();
r.use(requireAuth);
r.get("/", list);
r.post("/", create);
export default r;
