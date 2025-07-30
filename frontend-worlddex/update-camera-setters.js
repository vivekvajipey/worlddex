// Script to help identify and update all state setters in camera.tsx

const replacements = [
  // Location updates
  { from: /setLocation\(/g, to: "dispatch(actions.setLocation(" },
  
  // Capture state updates
  { from: /setIsCapturing\(true\)/g, to: "dispatch(actions.startCapture())" },
  { from: /setIsCapturing\(false\)/g, to: "dispatch(actions.captureFailed())" },
  { from: /setCapturedUri\(([^)]+)\)/g, to: "dispatch(actions.captureSuccess($1))" },
  { from: /setCapturedUri\(null\)/g, to: "dispatch(actions.resetCapture())" },
  { from: /setCaptureBox\(/g, to: "dispatch(actions.setCaptureBox(" },
  
  // VLM state updates
  { from: /setVlmCaptureSuccess\(true\)/g, to: "dispatch(actions.vlmProcessingSuccess(identifiedLabel || ''))" },
  { from: /setVlmCaptureSuccess\(false\)/g, to: "dispatch(actions.vlmProcessingFailed())" },
  { from: /setVlmCaptureSuccess\(null\)/g, to: "dispatch(actions.vlmProcessingStart())" },
  { from: /setIdentifiedLabel\(([^)]+)\)/g, to: "// Label is set via vlmProcessingSuccess" },
  { from: /setIdentifiedLabel\(null\)/g, to: "// Label reset via vlmProcessingStart" },
  { from: /setIdentificationComplete\(true\)/g, to: "dispatch(actions.identificationComplete())" },
  { from: /setIdentificationComplete\(false\)/g, to: "// Reset via vlmProcessingStart" },
  
  // Metadata updates
  { from: /setIsCapturePublic\(/g, to: "dispatch(actions.setPublicStatus(" },
  { from: /setRarityTier\(/g, to: "dispatch(actions.setRarity(" },
  { from: /setRarityScore\(/g, to: "dispatch(actions.setRarity(rarityTier, " },
];

console.log("State setter replacement patterns:");
replacements.forEach(r => {
  console.log(`${r.from} -> ${r.to}`);
});