import { Router, RequestHandler } from "express";
import { VlmService } from "../services/vlmService";
import { VlmIdentificationRequest, VlmIdentificationResponse } from "../../shared/types/vlm";

const router = Router();
const vlmService = new VlmService();

// DEBUG: log when router is used
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] VLM Router handling request for ${req.originalUrl}`);
  next();
});

interface ErrorResponse {
    error: string;
}

const identifyHandler: RequestHandler = async (req, res) => {
    try {
        const requestData = req.body as VlmIdentificationRequest;

        if (!requestData.base64Data || !requestData.contentType) {
            res.status(400).json({ error: "Missing required identification data (base64Data, contentType)" });
            return;
        }

        const result = await vlmService.identifyImage(requestData);
        console.log("VLM Identification Result:", result); // DEBUG
        res.json(result); // Sends back { label: "..." }

    } catch (error: unknown) {
        console.error("VLM identification error in route:", error);
        
        const errorResponse: ErrorResponse = { 
            error: error instanceof Error ? error.message : "Failed to identify image" 
        };
        
        res.status(500).json(errorResponse);
    }
};

router.post("/identify", identifyHandler);

export default router;