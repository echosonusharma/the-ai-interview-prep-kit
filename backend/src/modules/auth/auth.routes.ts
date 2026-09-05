import { Router } from "express";
import { signup, login, logout, me } from "./auth.controller.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import { validate } from "../../middleware/validate.js";
import { signupBody, loginBody } from "../../validators/http.validator.js";

const router = Router();

router.post("/signup", authLimiter, validate({ body: signupBody }), signup);
router.post("/login", authLimiter, validate({ body: loginBody }), login);
router.post("/logout", logout);
router.get("/me", me);

export default router;
