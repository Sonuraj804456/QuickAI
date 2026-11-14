import express from "express";
import { auth } from "../middlewares/auth.js";
import {
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  resumeReview,
  removeImageObject,
  deepResearch,
  analyzeLecture,
  chatLecture,
} from "../controllers/aiController.js";
import { upload } from "../configs/multer.js";

const aiRouter = express.Router();

aiRouter.post('/generate-article', auth, generateArticle);
aiRouter.post('/generate-blog-title', auth, generateBlogTitle);
aiRouter.post('/lecture-copilot/analyze', auth, analyzeLecture);
aiRouter.post('/lecture-copilot/chat', auth, chatLecture);
aiRouter.post('/deep-research', auth, deepResearch);

aiRouter.post(
  '/remove-image-background',
  upload.single('image'),
  auth,
  removeImageBackground
);

aiRouter.post(
  '/remove-image-object',
  upload.single('image'),
  auth,
  removeImageObject
);

aiRouter.post(
  '/resume-review',
  upload.single('resume'),
  auth,
  resumeReview
);

export default aiRouter;
