#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createBackstageApiWrapper } from "./backstage-api.js";
import { Logger } from "pino";

type McpServerConfig = {
  log: Logger,
  token: string,
  baseUrl: string
}

export default function getMcpServer (config: McpServerConfig) {
  const { log, token, baseUrl } = config

  const server = new Server(
    {
      name: "backstage",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const f = z.object({
    kind: z.string().toLowerCase().pipe(z.enum(['component', 'resource', 'system', 'api', 'location', 'user', 'group', 'domain', 'template'])),
    // metadata: z.object({
    //   name: z.string(),
    //   namespace: z.string(),
    //   annotations: z.record(z.string(), z.string()),
    // }).optional(),
    // description: z.string().optional(),
    // tags: z.array(z.string()).optional(),
    // spec: z.object({
    //   type: z.string(),
    //   owner: z.string()
    // }).optional()
  })

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_entities",
          description: "List C.H. Robinson's (CHR) Backstage entities such as Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project). Results are returned in JSON array format, where each entry is an object containing the entity 'name', 'uid', 'descriptions' and 'tags'.",
          inputSchema: zodToJsonSchema(f)
        },
        {
            name: "list_entities_matching_name",
            description: "This tools is useful and prefered to use over 'list_entities' if you know what entity kind and the name of the entity should be. Retrieve a C.H. Robinson's (CHR) Backstage entity such as a Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project) by its name. Results are returned in JSON array format, where each entry is an object containing the entity 'name', 'uid', 'descriptions' and 'tags'.",
            inputSchema: zodToJsonSchema(z.object({
                kind: f,
                name: z.string().describe('The name of the entity to match. This is a string, e.g. "my-component"')
            }))
        },
        {
          name: "get_entity_details",
          description: "Retrieve a C.H. Robinson's (CHR) Backstage entity such as a Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project) by its uid. Results are returned in JSON format.",
          inputSchema: zodToJsonSchema(z.object({
            uid: z.string().describe('The unique ID (uid) of the entity. This is a UUID, e.g UUID v4 format string')
          }))
        },
        {
          name: "search_software_catalog_documents",
          description: "Search for technical and organization relevant documents in Backstage about C.H. Robinson (CHR) software by a specified search query string.",
          inputSchema: zodToJsonSchema(z.object({
              query: z.string().describe('The search query string')
          }))
        }
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const api = createBackstageApiWrapper({
      token,
      baseUrl
    })

    try {
      if (!request.params.arguments) {
        throw new Error("Arguments are required for a tool call.");
      }

      log.info(`Received tool call "${request.params.name}"`)

      switch (request.params.name) {
        case "list_entities": {
          const entities = await api.getEntities(request.params.arguments['kind'] as any) // TODO verify input

          const text = JSON.stringify(entities.items.map((e: any) => {
            return { uid: e.metadata.uid, name: e.metadata.name, description: e.metadata.description, tags: e.metadata.tags }
          }))

          return {
            content: [{
              type: "text",
              text
            }]
          };
        }

        case "list_entities_matching_name": {
          const entities = await api.getEntitiesMatchingName(request.params.arguments['kind'] as any, request.params.arguments['name'] as any) // TODO verify input

          const text = JSON.stringify(entities.items.map((e: any) => {
            return { uid: e.metadata.uid, name: e.metadata.name, description: e.metadata.description, tags: e.metadata.tags }
          }))

          return {
            content: [{
              type: "text",
              text
            }]
          };
        }

        case "get_entity_details": {
          const e = await api.getEntityByUid(request.params.arguments['uid'] as any) // TODO verify input

          return {
            content: [{ type: "text", text: JSON.stringify(e, null, 2) }],
          };
        }

        case "search_software_catalog_documents": {
          const e = await api.searchSoftwareCatalogDocuments(request.params.arguments['query'] as any)

          return {
            content: [{ type: "text", text: JSON.stringify(e, null, 2) }],
          }
        }

        default:
          throw new Error(`Unknown tool call "${request.params.name}"`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
      }

      throw error;
    }
  });

  return server
}