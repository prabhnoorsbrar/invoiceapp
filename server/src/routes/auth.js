import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, register, logout, updateMe, updateCompany } from "../controllers/authController.js";
import { validate, schemas } from "../utils/validate.js";
import { requireAuth } from "../utils/auth.js";
const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests, please try again later." },
});

r.post("/register", authLimiter, validate(schemas.register), register);
r.post("/login", authLimiter, validate(schemas.login), login);
r.post("/logout", logout);
r.put("/me", requireAuth, validate(schemas.updateMe), updateMe);
r.put("/company", requireAuth, validate(schemas.updateCompany), updateCompany);
export default r;
