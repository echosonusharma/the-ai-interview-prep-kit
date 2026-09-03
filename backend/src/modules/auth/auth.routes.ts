import { Router } from "express";
import { signup, login, logout, me } from "./auth.controller.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", me);

export default router;