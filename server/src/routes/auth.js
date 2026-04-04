import { Router } from "express";
import { login, register } from "../controllers/authController.js";
import { validate, schemas } from "../utils/validate.js";
const r = Router();
r.post("/register", validate(schemas.register), register);
r.post("/login", validate(schemas.login), login);
export default r;
