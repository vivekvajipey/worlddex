import { useState } from "react";
import { IdentifyRequest, IdentifyResponse } from "../../../shared/types/identify";
import { API_URL } from "../config";
import { createParser } from "eventsource-parser";

export function useIdentify(){
  const [tier1,setTier1]=useState<string|null>(null);
  const [tier2,setTier2]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  const identify = async (req:IdentifyRequest)=>{
    setTier1(null); setTier2(null); setLoading(true);

    const res = await fetch(`${API_URL}/identify`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(req)
    });
    const data = await res.json() as IdentifyResponse;
    setTier1(data.tier1.label);
    if (data.status==="done"){ setLoading(false); return; }

    // open SSE for Tier‑2
    const stream = await fetch(`${API_URL}/identify/stream/${data.jobId}`);
    const reader = stream.body!.getReader();
    const parser = createParser({
      onEvent: (event) => {
        if (event.event === undefined) return; // Skip comments or empty events
        const payload = JSON.parse(event.data);
        if (payload.event==="completed"){
          setTier2(payload.data.label);
          setLoading(false);
        }
      }
    });
    while(true){
      const {value,done} = await reader.read();
      if (done) break;
      parser.feed(new TextDecoder().decode(value));
    }
  };

  return { tier1, tier2, loading, identify };
}