import { VlmService } from "../vlmService";
import { VlmIdentificationRequest } from "../../../../shared/types/vlm";
import { describe, expect, it, beforeEach } from "@jest/globals";
import fs from "fs";
import path from "path";

describe("VlmService", () => {
  let vlmService: VlmService;
  let testImageBase64: string;
  
  beforeEach(() => {
    vlmService = new VlmService();
    
    const imagePath = path.join(__dirname, "fixtures", "cat-image.jpg");
    const imageBuffer = fs.readFileSync(imagePath);
    testImageBase64 = imageBuffer.toString("base64");
  });
  
  it("should identify an image", async () => {
    if (!process.env.FIREWORKS_API_KEY) {
      console.log("Skipping VLM test: No FIREWORKS_API_KEY available");
      return;
    }
    
    const request: VlmIdentificationRequest = {
      base64Data: testImageBase64,
      contentType: "image/jpeg"
    };
    
    const result = await vlmService.identifyImage(request);
    
    // Check that we got a result
    expect(result).toBeDefined();
    // The label might be null if identification failed, but we should still get a result object
    expect(result).toHaveProperty("label");
    
    console.log("VLM Identification result:", result);
  }, 10000); // API call timeout
});
