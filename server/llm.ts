import { MessageParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { AnthropicLargeLanguageProvider } from './anthropic'
import { createHomeAssistantServer } from './mcp/home-assistant'
import { createNotifyServer } from './mcp/notify'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { OllamaLargeLanguageProvider } from './ollama'
import { OpenAILargeLanguageProvider } from './openai'
import { Observable } from 'rxjs'
import { HomeAssistantApi } from './lib/ha-ws-api'

export interface LargeLanguageProvider {
  executePromptWithTools(
    prompt: string,
    toolServers: McpServer[],
    previousMessages?: MessageParam[]
  ): Observable<MessageParam>

  getModelList(): Promise<string[]>
}

export function createDefaultLLMProvider() {
  let llm: LargeLanguageProvider

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Found Anthropic API key, using Anthropic as provider')
    llm = new AnthropicLargeLanguageProvider(process.env.ANTHROPIC_API_KEY)
  } else if (process.env.OPENAI_API_KEY) {
    console.log('Found OpenAI API key, using OpenAI as provider')
    llm = new OpenAILargeLanguageProvider()
  } else if (process.env.OLLAMA_HOST) {
    console.log('Found Ollama host, using Ollama as provider')
    llm = new OllamaLargeLanguageProvider(process.env.OLLAMA_HOST)
  } else {
    throw new Error(
      "Can't find valid LLM provider. Set either ANTHROPIC_API_KEY, OPENAI_API_KEY, or OLLAMA_HOST"
    )
  }

  return llm
}

export function createBuiltinServers(
  api: HomeAssistantApi,
  llm: LargeLanguageProvider,
  opts?: { testMode?: boolean }
) {
  const { testMode } = opts ?? {}

  return [
    createNotifyServer(api),
    createHomeAssistantServer(api, llm, { testMode: testMode ?? false }),
  ]
}

export function connectServersToClient(client: Client, servers: Server[]) {
  servers.forEach((server) => {
    const [cli, srv] = InMemoryTransport.createLinkedPair()
    void client.connect(cli)
    void server.connect(srv)
  })
}
