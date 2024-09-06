import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export async function searchExa(query: string) {
  try {
    const result = await exa.searchAndContents(
      query,
      {
        type: "neural",
        useAutoprompt: true,
        numResults: 10,
        text: true
      }
    );
    return result;
  } catch (error) {
    console.error('Error calling Exa:', error);
    throw error;
  }
}