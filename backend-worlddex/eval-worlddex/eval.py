import os
import yaml
import litellm
import time
import base64
import csv
import logging
from datetime import datetime
from image_utils import encode_image_to_base64, get_image_mime_type


PROMPTS_FILE = 'prompts.yaml'
IMAGE_DIR = 'eval_images'
RESULTS_FILE = 'evaluation_results.csv'
LLM_NAME = "gemini/gemini-2.0-flash"

litellm.set_verbose = False
logging.getLogger('LiteLLM').setLevel(logging.WARNING)

def run_evaluation():
    # Load prompts
    try:
        with open(PROMPTS_FILE, 'r') as f:
            prompts = yaml.safe_load(f)
        if not prompts:
            print(f"Error: {PROMPTS_FILE} is empty or invalid.")
            return
    except FileNotFoundError:
        print(f"Error: {PROMPTS_FILE} not found.")
        return
    except Exception as e:
        print(f"Error reading {PROMPTS_FILE}: {e}")
        return

    # Find images
    if not os.path.isdir(IMAGE_DIR):
        print(f"Error: Image directory '{IMAGE_DIR}' not found.")
        return

    image_files = [f for f in os.listdir(IMAGE_DIR)
                   if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    if not image_files:
        print(f"No valid images found in '{IMAGE_DIR}'.")
        return

    print(f"Starting evaluation for model: {LLM_NAME}")
    print(f"Found {len(prompts)} prompts and {len(image_files)} images.")

    # Prepare results file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_filename = f"evaluation_results_{LLM_NAME.replace('/', '_')}_{timestamp}.csv"

    with open(results_filename, 'w', newline='', encoding='utf-8') as csvfile:
        fieldnames = ['prompt_id', 'image_file', 'model', 'predicted_label', 'latency_ms', 'cost_usd']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()

        # Start evaluation loops
        for prompt_id, prompt_text in prompts.items():
            print(f"\n--- Testing Prompt: {prompt_id} ---")
            for image_filename in image_files:
                image_path = os.path.join(IMAGE_DIR, image_filename)
                print(f"  Processing: {image_filename}...")

                base64_image = encode_image_to_base64(image_path)
                if not base64_image:
                    raise ValueError(f"Failed to encode image {image_path}")

                mime_type = get_image_mime_type(image_path)

                messages = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt_text},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ]

                predicted_label = "ERROR"
                latency_ms = -1.0
                cost_usd = 0.0

                try:
                    start_time = time.time()
                    response = litellm.completion(
                        model=LLM_NAME,
                        messages=messages,
                        max_tokens=100,
                        temperature=0.0
                    )
                    end_time = time.time()

                    latency_ms = round((end_time - start_time) * 1000)

                    if response.choices and response.choices[0].message and response.choices[0].message.content:
                         predicted_label = response.choices[0].message.content.strip()
                    else:
                        print(response)
                        breakpoint()

                    cost_usd = litellm.completion_cost(completion_response=response)
                    if cost_usd is None:
                        raise ValueError("Failed to calculate cost")

                except Exception as e:
                    print(f"    ERROR during API call for {image_filename}: {e}")
                    predicted_label = f"ERROR: {type(e).__name__}"
                    if 'start_time' in locals():
                         latency_ms = round((time.time() - start_time) * 1000)

                writer.writerow({
                    'prompt_id': prompt_id,
                    'image_file': image_filename,
                    'model': LLM_NAME,
                    'predicted_label': predicted_label,
                    'latency_ms': latency_ms,
                    'cost_usd': cost_usd
                })

    print(f"\nEvaluation finished. Results saved to '{results_filename}'")

if __name__ == "__main__":
    run_evaluation()



