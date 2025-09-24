import { config } from 'dotenv'
import { AzureChatOpenAI } from '@langchain/openai'

config()

const { AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME, AZURE_OPENAI_API_VERSION, AZURE_OPENAI_RESOURCE_NAME } = process.env

if (!AZURE_OPENAI_API_KEY) {
  throw new Error('Missing AZURE_OPENAI_API_KEY environment variable.')
}

if (!AZURE_OPENAI_ENDPOINT) {
  throw new Error('Missing AZURE_OPENAI_ENDPOINT environment variable.')
}

if (!AZURE_OPENAI_DEPLOYMENT_NAME) {
  throw new Error('Missing AZURE_OPENAI_DEPLOYMENT_NAME environment variable.')
}

if (!AZURE_OPENAI_RESOURCE_NAME) {
  throw new Error('Missing AZURE_OPENAI_RESOURCE_NAME environment variable.')
}

export const llm = new AzureChatOpenAI({
  azureOpenAIApiKey: AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: AZURE_OPENAI_ENDPOINT,
  azureOpenAIApiInstanceName: AZURE_OPENAI_RESOURCE_NAME,
  azureOpenAIApiDeploymentName: AZURE_OPENAI_DEPLOYMENT_NAME,
  azureOpenAIApiVersion: AZURE_OPENAI_API_VERSION ?? '2024-12-01-preview',
  maxRetries: 2,
})

export default llm
