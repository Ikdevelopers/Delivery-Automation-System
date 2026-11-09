import { Router } from "express";
import verifyJWT from "../middleware/auth.middleware.js";
import authorizeRoles from "../middleware/rbac.middleware.js";
import { tempController } from "../controllers/tenant.controller.js"


const router = Router();

router.post("/", verifyJWT, authorizeRoles("super_admin"), tempController);
router.get("/", verifyJWT, authorizeRoles("super_admin"), tempController);
router.post("/admins", verifyJWT, authorizeRoles("super_admin"), tempController);
router.get("/admins", verifyJWT, authorizeRoles("super_admin"), tempController);

export default router;