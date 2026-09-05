import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validate } from "../../middleware/validate.js";
import {
  briefPatchBody,
  createKitBatchBody,
  createKitBody,
  dashboardQuery,
  flashcardAddBody,
  flashcardIdParams,
  flashcardPatchBody,
  kitIdParams,
  listKitsQuery,
  practiceReviewBody,
  questionAddBody,
  questionIdParams,
  questionPatchBody,
  regenParams,
  reorderBody,
  requirementAddBody,
  requirementIdParams,
  requirementPatchBody,
} from "../../validators/http.validator.js";
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
  deleteKitHandler,
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
router.post("/batch", validate({ body: createKitBatchBody }), asyncHandler(createKitBatchHandler));
router.post("/", validate({ body: createKitBody }), asyncHandler(createKitHandler));
router.get("/", validate({ query: listKitsQuery }), asyncHandler(listKitsHandler));

// Dashboard (before :id routes — "dashboard" must not be treated as a kit id)
router.get(
  "/dashboard/summary",
  validate({ query: dashboardQuery }),
  asyncHandler(getDashboardHandler)
);

// Practice (before :id routes that might conflict — use explicit paths)
router.get("/:id/practice", validate({ params: kitIdParams }), asyncHandler(getPracticeHandler));
router.post(
  "/:id/practice/review",
  validate({ params: kitIdParams, body: practiceReviewBody }),
  asyncHandler(postPracticeReviewHandler)
);

// SSE & detail
router.get("/:id/events", validate({ params: kitIdParams }), asyncHandler(streamKitEventsHandler));
router.get("/:id", validate({ params: kitIdParams }), asyncHandler(getKitHandler));
router.delete("/:id", validate({ params: kitIdParams }), asyncHandler(deleteKitHandler));

// Builder
router.patch(
  "/:id/brief",
  validate({ params: kitIdParams, body: briefPatchBody }),
  asyncHandler(patchBriefHandler)
);
router.patch(
  "/:id/questions/reorder",
  validate({ params: kitIdParams, body: reorderBody }),
  asyncHandler(reorderQuestionsHandler)
);
router.post(
  "/:id/questions",
  validate({ params: kitIdParams, body: questionAddBody }),
  asyncHandler(postQuestionHandler)
);
router.patch(
  "/:id/questions/:qid",
  validate({ params: questionIdParams, body: questionPatchBody }),
  asyncHandler(patchQuestionHandler)
);
router.delete(
  "/:id/questions/:qid",
  validate({ params: questionIdParams }),
  asyncHandler(deleteQuestionHandler)
);
router.post(
  "/:id/requirements",
  validate({ params: kitIdParams, body: requirementAddBody }),
  asyncHandler(postRequirementHandler)
);
router.patch(
  "/:id/requirements/:rid",
  validate({ params: requirementIdParams, body: requirementPatchBody }),
  asyncHandler(patchRequirementHandler)
);
router.delete(
  "/:id/requirements/:rid",
  validate({ params: requirementIdParams }),
  asyncHandler(deleteRequirementHandler)
);
router.post(
  "/:id/flashcards",
  validate({ params: kitIdParams, body: flashcardAddBody }),
  asyncHandler(postFlashcardHandler)
);
router.patch(
  "/:id/flashcards/:fid",
  validate({ params: flashcardIdParams, body: flashcardPatchBody }),
  asyncHandler(patchFlashcardHandler)
);
router.delete(
  "/:id/flashcards/:fid",
  validate({ params: flashcardIdParams }),
  asyncHandler(deleteFlashcardHandler)
);
router.post(
  "/:id/regenerate/:section",
  validate({ params: regenParams }),
  asyncHandler(regenerateSectionHandler)
);

export default router;
