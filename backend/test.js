import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCbWf-v29u7nnejkIxPxzfE4bTB9PWK7wM");

async function run() {
    const models = await genAI.listModels();
    console.log(models);
}

run();