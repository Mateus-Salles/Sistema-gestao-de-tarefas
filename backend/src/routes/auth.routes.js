import { Router } from "express";
import { login, logout, changePassword } from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { loginSchema, changePasswordSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/login", validateSchema(loginSchema), login);
router.post("/logout", authenticate, logout);
router.patch("/senha", authenticate, validateSchema(changePasswordSchema), changePassword);

export default router;
