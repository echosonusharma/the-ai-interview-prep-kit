import { Router } from "express";
import { signup, login, logout, me } from "./auth.controller.js";
import { authLimiter } from "../../middleware/rateLimit.js";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", me);

export default router;