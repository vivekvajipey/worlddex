import { Router, RequestHandler } from "express";
import { VlmService } from "../services/vlmService";
import { decideTier2 } from "../services/routerService";
import { tier2Queue } from "../services/jobQueue";
import { IdentifyRequest, IdentifyResponse } from "../../../shared/types/identify";

const router = Router();
const vlm = new VlmService();

// POST /api/identify  →  immediate Tier‑1 + maybe enqueue Tier‑2
const identifyHandler:RequestHandler = async (req,res) => {
  // Very early debug log to see if the handler is being called at all
  console.log("=====================================");
  console.log("IDENTIFY HANDLER CALLED");
  console.log("=====================================");
  
  const body = req.body as IdentifyRequest;
  
  // Add detailed debug log to see what's being received
  console.log("=== DEBUG: Identify Request ===");
  console.log("Content Type:", body.contentType);
  console.log("Has base64Data:", !!body.base64Data);
  console.log("GPS:", body.gps);
  
  const tier1 = await vlm.identifyImage({
    base64Data: body.base64Data,
    contentType: body.contentType
  });

  const routing = decideTier2(
    tier1.label, 
    body.gps,
    tier1.category,
    tier1.subcategory
  );
  
  // Log the routing decision and Tier 1 result
  console.log("=== DEBUG: Routing Decision ===");
  console.log("Tier 1 Result:", { 
    label: tier1.label, 
    category: tier1.category,
    subcategory: tier1.subcategory 
  });
  console.log("Routing Decision:", routing);
  
  if (!routing.run){
    const response:IdentifyResponse = { status:"done", tier1 };
    res.json(response);
    return;
  }

  console.log(`Creating Tier2 job with module: ${routing.module}`);
  
  const job = await tier2Queue.add("work", {
    base64Data: body.base64Data,
    module: routing.module as "plants" | "stanford",
    gps: body.gps
  }, { removeOnComplete: 1000 });
  
  console.log(`Created Tier2 job with ID: ${job.id}`);

  const response:IdentifyResponse = {
    status:"pending",
    tier1,
    jobId: job.id as string
  };
  res.json(response);
};

// SSE endpoint: /api/identify/stream/:jobId
const streamHandler:RequestHandler = async (req,res) => {
  const jobId = req.params.jobId;
  console.log(`SSE Stream requested for job: ${jobId} from ${req.ip}`);
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));
  
  // Set CORS headers for SSE
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
  // Standard SSE headers
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");

  // Helper to send SSE messages
  const send = (event:string,data:any)=> {
    const message = `data:${JSON.stringify({event,data})}\n\n`;
    console.log(`[SSE] Sending message: ${message.substring(0, 100)}...`);
    res.write(message);
  }

  const job = await tier2Queue.getJob(jobId);
  if (!job){ 
    console.log(`Job ${jobId} not found`);
    send("error","Job not found"); 
    return; 
  }
  
  console.log(`Found job ${jobId}, current state: ${await job.getState()}`);

  // Send initial connection confirmation
  send("connected", { message: "SSE connection established" });

  const check = setInterval(async ()=>{
    try {
      // Get a fresh copy of the job on each check for the most current state
      const freshJob = await tier2Queue.getJob(jobId);
      if (!freshJob) {
        console.warn(`Job ${jobId} no longer exists`);
        clearInterval(check);
        send("failed", { message: "Job not found" });
        return res.end();
      }
      
      const state = await freshJob.getState();
      console.log(`Job ${jobId} state check: ${state}`);
      
      if (state === "completed") {
        clearInterval(check);
        
        // Get the completed job result
        const result = freshJob.returnvalue;
        console.log(`Job ${jobId} completed, result:`, JSON.stringify(result));
        
        // Check if we have a valid result with label
        if (result && typeof result === 'object' && result.label) {
          console.log(`Sending valid tier2 result for job ${jobId}:`, JSON.stringify(result));
          send("completed", result);
        } else {
          console.warn(`Job ${jobId} has invalid result:`, result);
          send("failed", { message: "Invalid identification result" });
        }
        
        // Explicitly end the response after a short delay to ensure message is sent
        setTimeout(() => {
          console.log(`Ending SSE connection for job ${jobId}`);
          res.end();
        }, 500);
      } else if (state === "failed") {
        clearInterval(check);
        console.log(`Job ${jobId} failed`);
        send("failed", { message: "Identification processing failed" });
        res.end();
      }
    } catch (error) {
      console.error(`Error checking job ${jobId} status:`, error);
      clearInterval(check);
      send("failed", { message: "Error monitoring job status" });
      res.end();
    }
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`SSE connection closed for job ${jobId} by client`);
    clearInterval(check);
  });
};

// Add GET endpoint for polling job status
const jobStatusHandler: RequestHandler = async (req, res) => {
  const jobId = req.params.jobId;
  console.log(`Job status check requested for job: ${jobId} from ${req.ip}`);
  
  const job = await tier2Queue.getJob(jobId);
  if (!job) {
    console.log(`Job ${jobId} not found`);
    res.status(404).json({ status: "error", message: "Job not found" });
    return;
  }
  
  const state = await job.getState();
  console.log(`Job ${jobId} status: ${state}`);
  
  if (state === "completed") {
    console.log(`Job ${jobId} completed, returning results for polling`);
    res.json({
      status: "completed",
      data: job.returnvalue
    });
  } else if (state === "failed") {
    console.log(`Job ${jobId} failed`);
    res.json({
      status: "failed"
    });
  } else {
    res.json({
      status: "pending"
    });
  }
};

router.post("/", identifyHandler);
router.get("/stream/:jobId", streamHandler);
router.get("/job/:jobId", jobStatusHandler);

export default router;