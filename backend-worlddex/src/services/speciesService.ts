import axios from "axios";
import { Tier2Result } from "../../shared/types/identify";
import FormData from "form-data";

export async function identifySpecies(base64Data:string):Promise<Tier2Result>{
  // iNaturalist API requires authentication and is not easily accessible
  throw new Error("iNaturalist API is not accessible. Using plantService for plant identification instead.");
}
