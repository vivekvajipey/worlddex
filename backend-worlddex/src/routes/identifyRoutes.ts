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
  console.log("Active Collections:", body.activeCollections);
  console.log("Content Type:", body.contentType);
  console.log("Has base64Data:", !!body.base64Data);
  console.log("GPS:", body.gps);
  
  const tier1 = await vlm.identifyImage({
    base64Data: body.base64Data,
    contentType: body.contentType
  });

  const routing = decideTier2(
    tier1.label, 
    body.activeCollections, 
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
    module: routing.module as "species" | "landmark",
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
  console.log(`SSE Stream requested for job: ${jobId}`);
  
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");

  const send = (event:string,data:any)=>
    res.write(`data:${JSON.stringify({event,data})}\n\n`);

  const job = await tier2Queue.getJob(jobId);
  if (!job){ 
    console.log(`Job ${jobId} not found`);
    send("error","Job not found"); 
    return; 
  }
  
  console.log(`Found job ${jobId}, current state: ${await job.getState()}`);

  const check = setInterval(async ()=>{
    const state = await job.getState();
    console.log(`Job ${jobId} state check: ${state}`);
    
    if (state === "completed") {
      clearInterval(check);
      console.log(`Job ${jobId} completed, sending results`);
      send("completed", job.returnvalue);
      res.end();
    } else if (state === "failed"){
      clearInterval(check);
      console.log(`Job ${jobId} failed`);
      send("failed",null);
      res.end();
    }
  }, 500);
};

router.post("/", identifyHandler);
router.get("/stream/:jobId", streamHandler);

export default router;