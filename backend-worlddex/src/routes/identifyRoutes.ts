import { Router, RequestHandler } from "express";
import { VlmService } from "../services/vlmService";
import { decideTier2 } from "../services/routerService";
import { tier2Queue } from "../services/jobQueue";
import { IdentifyRequest, IdentifyResponse } from "../../../shared/types/identify";

const router = Router();
const vlm = new VlmService();

// POST /api/identify  →  immediate Tier‑1 + maybe enqueue Tier‑2
const identifyHandler:RequestHandler = async (req,res) => {
  const body = req.body as IdentifyRequest;
  const tier1 = await vlm.identifyImage({
    base64Data: body.base64Data,
    contentType: body.contentType
  });

  const routing = decideTier2(tier1.label, body.activeCollections, body.gps);
  if (!routing.run){
    const response:IdentifyResponse = { status:"done", tier1 };
    res.json(response);
    return;
  }

  const job = await tier2Queue.add("work", {
    base64Data: body.base64Data,
    module: routing.module as "species" | "landmark",
    gps: body.gps
  }, { removeOnComplete: 1000 });

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
  res.setHeader("Content-Type","text/event-stream");
  res.setHeader("Cache-Control","no-cache");
  res.setHeader("Connection","keep-alive");

  const send = (event:string,data:any)=>
    res.write(`data:${JSON.stringify({event,data})}\n\n`);

  const job = await tier2Queue.getJob(jobId);
  if (!job){ send("error","Job not found"); return; }

  const check = setInterval(async ()=>{
    const state = await job.getState();
    if (state === "completed") {
      clearInterval(check);
      send("completed", job.returnvalue);
      res.end();
    } else if (state === "failed"){
      clearInterval(check);
      send("failed",null);
      res.end();
    }
  }, 500);
};

router.post("/identify", identifyHandler);
router.get("/identify/stream/:jobId", streamHandler);

export default router;