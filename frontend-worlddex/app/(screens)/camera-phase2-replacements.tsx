// This is a mapping file to help with the replacements
// Original setter -> New dispatch action

// Capture actions
setIsCapturing(true) -> dispatch(actions.startCapture())
setIsCapturing(false) -> dispatch(actions.captureFailed()) // or captureSuccess if we have a URI
setCapturedUri(uri) -> dispatch(actions.captureSuccess(uri))
setCapturedUri(null) -> dispatch(actions.resetCapture())
setCaptureBox(box) -> dispatch(actions.setCaptureBox(box))

// Location actions  
setLocation(coords) -> dispatch(actions.setLocation(coords))
setLocation(null) -> dispatch(actions.setLocation(null))

// VLM/Identification actions
setVlmCaptureSuccess(true) -> dispatch(actions.vlmProcessingSuccess(label))
setVlmCaptureSuccess(false) -> dispatch(actions.vlmProcessingFailed())
setVlmCaptureSuccess(null) -> dispatch(actions.vlmProcessingStart())
setIdentifiedLabel(label) -> // handled by vlmProcessingSuccess
setIdentifiedLabel(null) -> // handled by vlmProcessingStart
setIdentificationComplete(true) -> dispatch(actions.identificationComplete())
setIdentificationComplete(false) -> // handled by vlmProcessingStart

// Metadata actions
setIsCapturePublic(value) -> dispatch(actions.setPublicStatus(value))
setRarityTier(tier) -> dispatch(actions.setRarity(tier))
setRarityScore(score) -> dispatch(actions.setRarity(rarityTier, score))

// Combined resets
Multiple resets -> dispatch(actions.resetAll()) or specific reset actions