import { Router } from "express";
import { register, login, logout, logoutAll } from "../controllers/auth.controller.js";
import { validateRegister } from "../middleware/validateRegister.middleware.js";
import verifyJWT from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", validateRegister, register);
router.post("/login",login);
router.post("/logout",verifyJWT , logout)
router.post("/logout-all", verifyJWT, logoutAll)

export default router;