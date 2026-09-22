const resources = [
  "banners",
  "bookingdetails",
  "bookings",
  "genres",
  "movie_genres",
  "moviedetails",
  "movies",
  "payments",
  "rooms",
  "seats",
  "seattypes",
  "showtimes",
  "theaters",
  "tickets",
  "userprofiles",
  "userroles",
  "users"
];

const response = (description, schema) => ({
  description,
  content: {
    "application/json": {
      schema
    }
  }
});

const itemPath = (resource) => ({
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: `ID of the ${resource} record`,
      schema: { type: "integer", format: "int64" }
    }
  ],
  get: {
    summary: `Get a ${resource} record`,
    responses: {
      200: response("Record returned successfully", { type: "object" }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  put: {
    summary: `Update a ${resource} record`,
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: {
      200: response("Record updated successfully", { $ref: "#/components/schemas/Message" }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  delete: {
    summary: `Delete a ${resource} record`,
    responses: {
      200: response("Record deleted successfully", { $ref: "#/components/schemas/Message" }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  }
});

const collectionPath = (resource) => ({
  get: {
    summary: `Get all ${resource}`,
    responses: {
      200: response("Records returned successfully", {
        type: "array",
        items: { type: "object" }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  post: {
    summary: `Create a ${resource} record`,
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: {
      200: response("Record created successfully", { $ref: "#/components/schemas/IdResponse" }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  }
});

const paths = {};
resources.forEach((resource) => {
  paths[`/api/${resource}`] = collectionPath(resource);
  paths[`/api/${resource}/{id}`] = itemPath(resource);
});

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "FoodDelivery Backend API",
    version: "1.0.0",
    description: "API documentation for testing the FoodDelivery backend."
  },
  servers: [{ url: "http://localhost:3000" }],
  tags: resources.map((name) => ({ name })),
  paths,
  components: {
    requestBodies: {
      Record: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
              description: "Send the fields required by the selected database table."
            }
          }
        }
      }
    },
    schemas: {
      IdResponse: {
        type: "object",
        properties: { id: { type: "integer", format: "int64" } }
      },
      Message: {
        type: "object",
        properties: { message: { type: "string" } }
      },
      Error: {
        type: "object",
        additionalProperties: true
      }
    }
  }
};
