import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import {
  createKitHandler,
  createKitBatchHandler,
  getDashboardHandler,
  getKitHandler,
  listKitsHandler,
  streamKitEventsHandler,
  patchBriefHandler,
  patchQuestionHandler,
  postQuestionHandler,
  deleteQuestionHandler,
  reorderQuestionsHandler,
  patchRequirementHandler,
  postRequirementHandler,
  deleteRequirementHandler,
  patchFlashcardHandler,
  postFlashcardHandler,
  deleteFlashcardHandler,
  regenerateSectionHandler,
  getPracticeHandler,
  postPracticeReviewHandler,
} from "./kit.controller.js";

const router = Router();

router.use(requireAuth);

// Create & list
router.post("/batch", asyncHandler(createKitBatchHandler));
router.post("/", asyncHandler(createKitHandler));
router.get("/", asyncHandler(listKitsHandler));

// Dashboard (before :id routes — "dashboard" must not be treated as a kit id)
router.get("/dashboard/summary", asyncHandler(getDashboardHandler));

// Practice (before :id routes that might conflict — use explicit paths)
router.get("/:id/practice", asyncHandler(getPracticeHandler));
router.post("/:id/practice/review", asyncHandler(postPracticeReviewHandler));

// SSE & detail
router.get("/:id/events", asyncHandler(streamKitEventsHandler));
router.get("/:id", asyncHandler(getKitHandler));

// Builder
router.patch("/:id/brief", asyncHandler(patchBriefHandler));
router.patch("/:id/questions/reorder", asyncHandler(reorderQuestionsHandler));
router.post("/:id/questions", asyncHandler(postQuestionHandler));
router.patch("/:id/questions/:qid", asyncHandler(patchQuestionHandler));
router.delete("/:id/questions/:qid", asyncHandler(deleteQuestionHandler));
router.post("/:id/requirements", asyncHandler(postRequirementHandler));
router.patch("/:id/requirements/:rid", asyncHandler(patchRequirementHandler));
router.delete("/:id/requirements/:rid", asyncHandler(deleteRequirementHandler));
router.post("/:id/flashcards", asyncHandler(postFlashcardHandler));
router.patch("/:id/flashcards/:fid", asyncHandler(patchFlashcardHandler));
router.delete("/:id/flashcards/:fid", asyncHandler(deleteFlashcardHandler));
router.post("/:id/regenerate/:section", asyncHandler(regenerateSectionHandler));

export default router;
