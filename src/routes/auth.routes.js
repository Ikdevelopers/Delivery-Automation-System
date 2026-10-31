import { Router } from "express";
import { register, login } from "../controllers/auth.controller.js";
import { validateRegister } from "../middleware/validateRegister.middleware.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login", login);

export default router;