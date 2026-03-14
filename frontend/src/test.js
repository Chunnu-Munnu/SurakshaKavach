import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(");

async function run() {
  const models = await genAI.listModels();
  console.log(models);
}

run();