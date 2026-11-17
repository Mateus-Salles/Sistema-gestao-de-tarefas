import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import clientRoutes from "./client.routes.js";

import projectRoutes from "./project.routes.js";

import launchModelRoutes from "./launch-model.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/usuarios", userRoutes);
router.use('/clientes', clientRoutes);

router.use('/projetos', projectRoutes);

router.use('/modelos-lancamento', launchModelRoutes);

export default router;
