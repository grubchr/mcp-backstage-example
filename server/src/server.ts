#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from 'zod';
import { createBackstageApiWrapper } from "./backstage-api.js";
import { Logger } from "pino";

type McpServerConfig = {
    log: Logger,
    token: string,
    baseUrl: string
}

export default function getMcpServer(config: McpServerConfig) {
    const {log, token, baseUrl} = config

    const server = new McpServer(
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

    const api = createBackstageApiWrapper({
        token,
        baseUrl
    })

    server.tool(
        "list_entities",
        "List C.H. Robinson's (CHR) Backstage entities such as Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project). Results are returned in JSON array format, where each entry is an object containing the entity 'name', 'uid', 'descriptions' and 'tags'.",
        {
            kind: z.string().pipe(z.enum(['Component', 'Resource', 'System', 'API', 'Location', 'User', 'Group', 'Domain', 'Template'])).describe('The kind of entity to look for')
        },
        async ({ kind }) => {
            log.info(`list_entities called with kind: ${kind}`);

            const entities = await api.getEntities(kind);

            const text = JSON.stringify(entities.items.map((e: any) => {
                return {
                    uid: e.metadata.uid,
                    name: e.metadata.name,
                    description: e.metadata.description,
                    tags: e.metadata.tags
                }
            }));

            return {
                content: [{
                    type: "text",
                    text
                }]
            };
        }
    );

    server.tool(
        "list_entities_matching_name",
        "This tools is useful and preferred to use over 'list_entities' if you know what entity kind and the name of the entity should be. Retrieve a C.H. Robinson's (CHR) Backstage entity such as a Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project) by its name. Results are returned in JSON array format, where each entry is an object containing the entity 'name', 'uid', 'descriptions' and 'tags'.",
        {
            kind: z.string().pipe(z.enum(['Component', 'Resource', 'System', 'API', 'Location', 'User', 'Group', 'Domain', 'Template'])).describe('The kind of entity to look for'),
            name: z.string().describe('The name of the entity to match. This is a string, e.g. "my-component"')
        },
        async ({ kind, name }, extra) => {
            log.info(`list_entities_matching_name called with kind: ${kind} and name: ${name}`);

            const entities = await api.getEntitiesMatchingName(kind, name);

            const text = JSON.stringify(entities.items.map((e: any) => {
                return {
                    uid: e.metadata.uid,
                    name: e.metadata.name,
                    description: e.metadata.description,
                    tags: e.metadata.tags
                }
            }));

            return {
                content: [{
                    type: "text",
                    text
                }]
            };
        }
    );

    server.tool(
        "get_entity_details",
        "Retrieve a C.H. Robinson's (CHR) Backstage entity such as a Components (individual software projects or applications deployed that may together create a system), Systems (one or more software projects or applications), Resources (discrete things a component or a system use such as a Kafka topic, a mongodb instance, an azure resource group, a Redis cache, a Kafka cluster or a Kubernetes cluster), APIs (a component that is an api application that also have an OpenAPI spec implemented), Locations (web URis), Users (a member of a Group), Groups (a collection of Users that are on the same team or squad), Domains (a specific product or technical knowledge of a System or Component that Group or User may specialize in) or Templates (a scripted software solution to generate a project) by its uid. Results are returned in JSON format.",
        {
            uid: z.string().describe('The unique ID (uid) of the entity. This is a UUID, e.g UUID v4 format string')
        },
        async ({ uid }) => {
            log.info(`get_entity_details called with uid: ${uid}`);

            const e = await api.getEntityByUid(uid);

            return {
                content: [{ type: "text", text: JSON.stringify(e, null, 2) }],
            };
        }
    );

    server.tool(
        "search_software_catalog_documents",
        "Search for technical and organization relevant documents in Backstage about C.H. Robinson (CHR) software by a specified search query string.",
        {
            query: z.string().describe('The search query string')
        },
        async ({ query }) => {
            log.info(`search_software_catalog_documents called with query: ${query}`);

            const e = await api.searchSoftwareCatalogDocuments(query);

            return {
                content: [{ type: "text", text: JSON.stringify(e, null, 2) }],
            }
        }
    )

    return server;
}