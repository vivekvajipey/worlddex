import axios from "axios";
import { Tier2Result } from "../../../shared/types/identify";
import FormData from "form-data";

export async function identifySpecies(base64Data:string):Promise<Tier2Result>{
  const form = new FormData();
  form.append("image", Buffer.from(base64Data, "base64"), { filename:"img.jpg" });

  const { data } = await axios.post(
    "https://api.inaturalist.org/v1/computervision/score_image",
    form, { headers: form.getHeaders() });

  const top = data?.results?.[0]?.taxon;
  return {
    label: top ? top.name : null,
    provider: "iNaturalist",
    confidence: data?.results?.[0]?.score ?? 0
  };
}
