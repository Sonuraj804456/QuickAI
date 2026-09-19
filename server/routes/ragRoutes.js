import express from "express";
import { auth } from "../middlewares/auth.js";
import { upload } from "../configs/multer.js";
import {
  uploadDocument,
  getUserDocuments,
  queryDocument,
  deleteDocument
} from "../controllers/ragController.js";

const ragRouter = express.Router();

ragRouter.post("/upload-document", upload.single("file"), auth, uploadDocument);
ragRouter.get("/documents", auth, getUserDocuments);
ragRouter.post("/query", auth, queryDocument);
ragRouter.delete("/document/:id", auth, deleteDocument);

export default ragRouter;
