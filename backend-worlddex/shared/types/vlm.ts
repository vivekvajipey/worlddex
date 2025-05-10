export interface VlmIdentificationRequest {
    base64Data: string;
    contentType: string; // e.g., "image/jpeg", "image/png"
}

export interface VlmIdentificationResponse {
    label: string | null;
    category: string | null;
    subcategory: string | null;
}