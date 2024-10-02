import { z } from "zod";

/* JSON-RPC types */
export const JSONRPCMessageSchema = z.union([
  z.lazy(() => JSONRPCRequestSchema),
  z.lazy(() => JSONRPCNotificationSchema),
  z.lazy(() => JSONRPCResponseSchema),
  z.lazy(() => JSONRPCErrorSchema)
]);

export const JSONRPC_VERSION = "2.0";

/**
 * A progress token, used to associate progress notifications with the original request.
 */
export const ProgressTokenSchema = z.union([z.string(), z.number()]);

export const RequestSchema = z.object({
  method: z.string(),
  params: z.optional(z.object({
    _meta: z.optional(z.object({
      /**
       * If specified, the caller is requesting out-of-band progress notifications for this request (as represented by notifications/progress). The value of this parameter is an opaque token that will be attached to any subsequent notifications. The receiver is not obligated to provide these notifications.
       */
      progressToken: z.optional(ProgressTokenSchema)
    })),
  }).catchall(z.unknown()))
});

export const NotificationSchema = z.object({
  method: z.string(),
  params: z.optional(z.object({
    /**
     * This parameter name is reserved by MCP to allow clients and servers to attach additional metadata to their notifications.
     */
    _meta: z.optional(z.record(z.unknown()))
  }).catchall(z.unknown()))
});

export const ResultSchema = z.object({
  /**
   * This result property is reserved by the protocol to allow clients and servers to attach additional metadata to their responses.
   */
  _meta: z.optional(z.record(z.unknown()))
}).catchall(z.unknown());

/**
 * A uniquely identifying ID for a request in JSON-RPC.
 */
export const RequestIdSchema = z.union([z.string(), z.number()]);

/**
 * A request that expects a response.
 */
export const JSONRPCRequestSchema = RequestSchema.extend({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema
});

/**
 * A notification which does not expect a response.
 */
export const JSONRPCNotificationSchema = NotificationSchema.extend({
  jsonrpc: z.literal(JSONRPC_VERSION)
});

/**
 * A successful (non-error) response to a request.
 */
export const JSONRPCResponseSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  result: ResultSchema
});

// Standard JSON-RPC error codes
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

/**
 * A response to a request that indicates an error occurred.
 */
export const JSONRPCErrorSchema = z.object({
  jsonrpc: z.literal(JSONRPC_VERSION),
  id: RequestIdSchema,
  error: z.object({
    /**
     * The error type that occurred.
     */
    code: z.number(),
    /**
     * A short description of the error. The message SHOULD be limited to a concise single sentence.
     */
    message: z.string(),
    /**
     * Additional information about the error. The value of this member is defined by the sender (e.g. detailed error information, nested errors etc.).
     */
    data: z.optional(z.unknown())
  })
});

/* Empty result */
/**
 * A response that indicates success but carries no data.
 */
export const EmptyResultSchema = ResultSchema;

/* Initialization */
export const PROTOCOL_VERSION = 1;
/**
 * This request is sent from the client to the server when it first connects, asking it to begin initialization.
 */
export const InitializeRequestSchema = RequestSchema.extend({
  method: z.literal("initialize"),
  params: z.object({
    /**
     * The latest version of the Model Context Protocol that the client supports. The client MAY decide to support older versions as well.
     */
    protocolVersion: z.literal(PROTOCOL_VERSION),
    capabilities: z.lazy(() => ClientCapabilitiesSchema),
    clientInfo: z.lazy(() => ImplementationSchema)
  })
});

/**
 * After receiving an initialize request from the client, the server sends this response.
 */
export const InitializeResultSchema = ResultSchema.extend({
  /**
   * The version of the Model Context Protocol that the server wants to use. This may not match the version that the client requested. If the client cannot support this version, it MUST disconnect.
   */
  protocolVersion: z.literal(PROTOCOL_VERSION),
  capabilities: z.lazy(() => ServerCapabilitiesSchema),
  serverInfo: z.lazy(() => ImplementationSchema)
});

/**
 * This notification is sent from the client to the server after initialization has finished.
 */
export const InitializedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/initialized")
});

/**
 * Capabilities a client may support. Known capabilities are defined here, in this schema, but this is not a closed set: any client can define its own, additional capabilities.
 */
export const ClientCapabilitiesSchema = z.object({
  /**
   * Experimental, non-standard capabilities that the client supports.
   */
  experimental: z.optional(z.record(z.object({}))),
  /**
   * Present if the client supports sampling from an LLM.
   */
  sampling: z.optional(z.object({}))
});

/**
 * Capabilities that a server may support. Known capabilities are defined here, in this schema, but this is not a closed set: any server can define its own, additional capabilities.
 */
export const ServerCapabilitiesSchema = z.object({
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental: z.optional(z.record(z.object({}))),
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging: z.optional(z.object({})),
  /**
   * Present if the server offers any prompt templates.
   */
  prompts: z.optional(z.object({})),
  /**
   * Present if the server offers any resources to read.
   */
  resources: z.optional(z.object({
    /**
     * Whether this server supports subscribing to resource updates.
     */
    subscribe: z.optional(z.boolean())
  })),
  /**
   * Present if the server offers any tools to call.
   */
  tools: z.optional(z.object({}))
});

/**
 * Describes the name and version of an MCP implementation.
 */
export const ImplementationSchema = z.object({
  name: z.string(),
  version: z.string()
});

/* Ping */
/**
 * A ping, issued by either the server or the client, to check that the other party is still alive. The receiver must promptly respond, or else may be disconnected.
 */
export const PingRequestSchema = RequestSchema.extend({
  method: z.literal("ping")
});

/* Progress notifications */
/**
 * An out-of-band notification used to inform the receiver of a progress update for a long-running request.
 */
export const ProgressNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/progress"),
  params: z.object({
    /**
     * The progress token which was given in the initial request, used to associate this notification with the request that is proceeding.
     */
    progressToken: ProgressTokenSchema,
    /**
     * The progress thus far. This should increase every time progress is made, even if the total is unknown.
     *
     * @TJS-type number
     */
    progress: z.number(),
    /**
     * Total number of items to process (or total progress required), if known.
     *
     * @TJS-type number
     */
    total: z.optional(z.number())
  })
});

/* Resources */
/**
 * Sent from the client to request a list of resources the server has.
 */
export const ListResourcesRequestSchema = RequestSchema.extend({
  method: z.literal("resources/list")
});

/**
 * The server's response to a resources/list request from the client.
 */
export const ListResourcesResultSchema = ResultSchema.extend({
  resourceTemplates: z.optional(z.array(z.lazy(() => ResourceTemplateSchema))),
  resources: z.optional(z.array(z.lazy(() => ResourceSchema)))
});

/**
 * Sent from the client to the server, to read a specific resource URI.
 */
export const ReadResourceRequestSchema = RequestSchema.extend({
  method: z.literal("resources/read"),
  params: z.object({
    /**
     * The URI of the resource to read. The URI can use any protocol; it is up to the server how to interpret it.
     *
     * @format uri
     */
    uri: z.string().uri()
  })
});

/**
 * The server's response to a resources/read request from the client.
 */
export const ReadResourceResultSchema = ResultSchema.extend({
  contents: z.array(z.union([z.lazy(() => TextResourceContentsSchema), z.lazy(() => BlobResourceContentsSchema)]))
});

/**
 * An optional notification from the server to the client, informing it that the list of resources it can read from has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ResourceListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/resources/list_changed")
});

/**
 * Sent from the client to request resources/updated notifications from the server whenever a particular resource changes.
 */
export const SubscribeRequestSchema = RequestSchema.extend({
  method: z.literal("resources/subscribe"),
  params: z.object({
    /**
     * The URI of the resource to subscribe to. The URI can use any protocol; it is up to the server how to interpret it.
     *
     * @format uri
     */
    uri: z.string().uri()
  })
});

/**
 * Sent from the client to request cancellation of resources/updated notifications from the server. This should follow a previous resources/subscribe request.
 */
export const UnsubscribeRequestSchema = RequestSchema.extend({
  method: z.literal("resources/unsubscribe"),
  params: z.object({
    /**
     * The URI of the resource to unsubscribe from.
     *
     * @format uri
     */
    uri: z.string().uri()
  })
});

/**
 * A notification from the server to the client, informing it that a resource has changed and may need to be read again. This should only be sent if the client previously sent a resources/subscribe request.
 */
export const ResourceUpdatedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/resources/updated"),
  params: z.object({
    /**
     * The URI of the resource that has been updated. This might be a sub-resource of the one that the client actually subscribed to.
     *
     * @format uri
     */
    uri: z.string().uri()
  })
});

/**
 * A known resource that the server is capable of reading.
 */
export const ResourceSchema = z.object({
  /**
   * The URI of this resource.
   *
   * @format uri
   */
  uri: z.string().uri(),

  /**
   * A human-readable name for this resource.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z.string(),

  /**
   * A description of what this resource represents.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z.optional(z.string()),

  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z.optional(z.string())
});

/**
 * A template description for resources available on the server.
 */
export const ResourceTemplateSchema = z.object({
  /**
   * A URI template (according to RFC 6570) that can be used to construct resource URIs.
   *
   * @format uri-template
   */
  uriTemplate: z.string(),

  /**
   * A human-readable name for the type of resource this template refers to.
   *
   * This can be used by clients to populate UI elements.
   */
  name: z.string(),

  /**
   * A description of what this template is for.
   *
   * This can be used by clients to improve the LLM's understanding of available resources. It can be thought of like a "hint" to the model.
   */
  description: z.optional(z.string()),

  /**
   * The MIME type for all resources that match this template. This should only be included if all resources matching this template have the same type.
   */
  mimeType: z.optional(z.string())
});

/**
 * The contents of a specific resource or sub-resource.
 */
export const ResourceContentsSchema = z.object({
  /**
   * The URI of this resource.
   *
   * @format uri
   */
  uri: z.string().uri(),
  /**
   * The MIME type of this resource, if known.
   */
  mimeType: z.optional(z.string())
});

export const TextResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * The text of the item. This must only be set if the item can actually be represented as text (not binary data).
   */
  text: z.string()
});

export const BlobResourceContentsSchema = ResourceContentsSchema.extend({
  /**
   * A base64-encoded string representing the binary data of the item.
   *
   * @format byte
   */
  blob: z.string()
});

/* Prompts */
/**
 * Sent from the client to request a list of prompts and prompt templates the server has.
 */
export const ListPromptsRequestSchema = RequestSchema.extend({
  method: z.literal("prompts/list")
});

/**
 * The server's response to a prompts/list request from the client.
 */
export const ListPromptsResultSchema = ResultSchema.extend({
  prompts: z.array(z.lazy(() => PromptSchema))
});

/**
 * Used by the client to get a prompt provided by the server.
 */
export const GetPromptRequestSchema = RequestSchema.extend({
  method: z.literal("prompts/get"),
  params: z.object({
    /**
     * The name of the prompt or prompt template.
     */
    name: z.string(),
    /**
     * Arguments to use for templating the prompt.
     */
    arguments: z.optional(z.record(z.string()))
  })
});

/**
 * The server's response to a prompts/get request from the client.
 */
export const GetPromptResultSchema = ResultSchema.extend({
  /**
   * An optional description for the prompt.
   */
  description: z.optional(z.string()),
  messages: z.array(z.lazy(() => SamplingMessageSchema))
});

/**
 * A prompt or prompt template that the server offers.
 */
export const PromptSchema = z.object({
  /**
   * The name of the prompt or prompt template.
   */
  name: z.string(),
  /**
   * An optional description of what this prompt provides
   */
  description: z.optional(z.string()),
  /**
   * A list of arguments to use for templating the prompt.
   */
  arguments: z.optional(z.array(z.lazy(() => PromptArgumentSchema)))
});

/**
 * Describes an argument that a prompt can accept.
 */
export const PromptArgumentSchema = z.object({
  /**
   * The name of the argument.
   */
  name: z.string(),
  /**
   * A human-readable description of the argument.
   */
  description: z.optional(z.string()),
  /**
   * Whether this argument must be provided.
   */
  required: z.optional(z.boolean())
});

/* Tools */
/**
 * Sent from the client to request a list of tools the server has.
 */
export const ListToolsRequestSchema = RequestSchema.extend({
  method: z.literal("tools/list")
});

/**
 * The server's response to a tools/list request from the client.
 */
export const ListToolsResultSchema = ResultSchema.extend({
  tools: z.array(z.lazy(() => ToolSchema))
});

/**
 * The server's response to a tool call.
 */
export const CallToolResultSchema = ResultSchema.extend({
  toolResult: z.unknown()
});

/**
 * Used by the client to invoke a tool provided by the server.
 */
export const CallToolRequestSchema = RequestSchema.extend({
  method: z.literal("tools/call"),
  params: z.object({
    name: z.string(),
    arguments: z.optional(z.record(z.unknown()))
  })
});

/**
 * An optional notification from the server to the client, informing it that the list of tools it offers has changed. This may be issued by servers without any previous subscription from the client.
 */
export const ToolListChangedNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/tools/list_changed")
});

/**
 * Definition for a tool the client can call.
 */
export const ToolSchema = z.object({
  /**
   * The name of the tool.
   */
  name: z.string(),
  /**
   * A human-readable description of the tool.
   */
  description: z.optional(z.string()),
  /**
   * A JSON Schema object defining the expected parameters for the tool.
   */
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.optional(z.record(z.object({})))
  })
});

/* Logging */
/**
 * A request from the client to the server, to enable or adjust logging.
 */
export const SetLevelRequestSchema = RequestSchema.extend({
  method: z.literal("logging/setLevel"),
  params: z.object({
    /**
     * The level of logging that the client wants to receive from the server. The server should send all logs at this level and higher (i.e., more severe) to the client as notifications/logging/message.
     */
    level: z.lazy(() => LoggingLevelSchema)
  })
});

/**
 * Notification of a log message passed from server to client. If no logging/setLevel request has been sent from the client, the server MAY decide which messages to send automatically.
 */
export const LoggingMessageNotificationSchema = NotificationSchema.extend({
  method: z.literal("notifications/message"),
  params: z.object({
    /**
     * The severity of this log message.
     */
    level: z.lazy(() => LoggingLevelSchema),
    /**
     * An optional name of the logger issuing this message.
     */
    logger: z.optional(z.string()),
    /**
     * The data to be logged, such as a string message or an object. Any JSON serializable type is allowed here.
     */
    data: z.unknown()
  })
});

/**
 * The severity of a log message.
 */
export const LoggingLevelSchema = z.enum(["debug", "info", "warning", "error"]);

/* Sampling */
/**
 * A request from the server to sample an LLM via the client. The client has full discretion over which model to select. The client should also inform the user before beginning sampling, to allow them to inspect the request (human in the loop) and decide whether to approve it.
 */
export const CreateMessageRequestSchema = RequestSchema.extend({
  method: z.literal("sampling/createMessage"),
  params: z.object({
    messages: z.array(z.lazy(() => SamplingMessageSchema)),
    /**
     * An optional system prompt the server wants to use for sampling. The client MAY modify or omit this prompt.
     */
    systemPrompt: z.optional(z.string()),
    /**
     * A request to include context from one or more MCP servers (including the caller), to be attached to the prompt. The client MAY ignore this request.
     */
    includeContext: z.optional(z.enum(["none", "thisServer", "allServers"])),
    /**
     * @TJS-type number
     */
    temperature: z.optional(z.number()),
    /**
     * The maximum number of tokens to sample, as requested by the server. The client MAY choose to sample fewer tokens than requested.
     */
    maxTokens: z.number(),
    stopSequences: z.optional(z.array(z.string())),
    /**
     * Optional metadata to pass through to the LLM provider. The format of this metadata is provider-specific.
     */
    metadata: z.optional(z.object({}))
  })
});

/**
 * The client's response to a sampling/create_message request from the server. The client should inform the user before returning the sampled message, to allow them to inspect the response (human in the loop) and decide whether to allow the server to see it.
 */
export const CreateMessageResultSchema = ResultSchema.extend({
  /**
   * The name of the model that generated the message.
   */
  model: z.string(),
  /**
   * The reason why sampling stopped.
   */
  stopReason: z.enum(["endTurn", "stopSequence", "maxTokens"]),
  role: z.enum(["user", "assistant"]),
  content: z.union([z.lazy(() => TextContentSchema), z.lazy(() => ImageContentSchema)])
});

/**
 * Describes a message issued to or received from an LLM API.
 */
export const SamplingMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.lazy(() => TextContentSchema), z.lazy(() => ImageContentSchema)])
});

/**
 * Text provided to or from an LLM.
 */
export const TextContentSchema = z.object({
  type: z.literal("text"),
  /**
   * The text content of the message.
   */
  text: z.string()
});

/**
 * An image provided to or from an LLM.
 */
export const ImageContentSchema = z.object({
  type: z.literal("image"),
  /**
   * The base64-encoded image data.
   *
   * @format byte
   */
  data: z.string(),
  /**
   * The MIME type of the image. Different providers may support different image types.
   */
  mimeType: z.string()
});

/* Autocomplete */
/**
 * A request from the client to the server, to ask for completion options.
 */
export const CompleteRequestSchema = RequestSchema.extend({
  method: z.literal("completion/complete"),
  params: z.object({
    ref: z.union([z.lazy(() => PromptReferenceSchema), z.lazy(() => ResourceReferenceSchema)]),
    /**
     * The argument's information
     */
    argument: z.object({
      /**
       * The name of the argument
       */
      name: z.string(),
      /**
       * The value of the argument to use for completion matching.
       */
      value: z.string()
    })
  })
});

/**
 * The server's response to a completion/complete request
 */
export const CompleteResultSchema = ResultSchema.extend({
  completion: z.object({
    /**
     * An array of completion values. Must not exceed 100 items.
     */
    values: z.array(z.string()).max(100),
    /**
     * The total number of completion options available. This can exceed the number of values actually sent in the response.
     */
    total: z.optional(z.number()),
    /**
     * Indicates whether there are additional completion options beyond those provided in the current response, even if the exact total is unknown.
     */
    hasMore: z.optional(z.boolean())
  })
});

/**
 * A reference to a resource or resource template definition.
 */
export const ResourceReferenceSchema = z.object({
  type: z.literal("ref/resource"),
  /**
   * The URI or URI template of the resource.
   *
   * @format uri-template
   */
  uri: z.string()
});

/**
 * Identifies a prompt.
 */
export const PromptReferenceSchema = z.object({
  type: z.literal("ref/prompt"),
  /**
   * The name of the prompt or prompt template
   */
  name: z.string()
});

/* Client messages */
export const ClientRequestSchema = z.union([
  PingRequestSchema,
  InitializeRequestSchema,
  CompleteRequestSchema,
  SetLevelRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  SubscribeRequestSchema,
  UnsubscribeRequestSchema,
  CallToolRequestSchema,
  ListToolsRequestSchema
]);

export const ClientNotificationSchema = z.union([ProgressNotificationSchema, InitializedNotificationSchema]);
export const ClientResultSchema = z.union([EmptyResultSchema, CreateMessageResultSchema]);

/* Server messages */
export const ServerRequestSchema = z.union([PingRequestSchema, CreateMessageRequestSchema]);

export const ServerNotificationSchema = z.union([
  ProgressNotificationSchema,
  LoggingMessageNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ToolListChangedNotificationSchema
]);

export const ServerResultSchema = z.union([
  EmptyResultSchema,
  InitializeResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  CallToolResultSchema,
  ListToolsResultSchema
]);

export const CONNECTION_CLOSED_ERROR = -1;

export class McpError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(`MCP error ${code}: ${message}`);
  }
}

export type Progress = Pick<
  z.infer<typeof ProgressNotificationSchema>["params"],
  "progress" | "total"
>;

export const PROGRESS_NOTIFICATION_METHOD: z.infer<typeof ProgressNotificationSchema>["method"] =
  "notifications/progress";
export const PING_REQUEST_METHOD: z.infer<typeof PingRequestSchema>["method"] = "ping";
