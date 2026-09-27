const resources = [
  "addresses",
  "admins",
  "cart_items",
  "carts",
  "categories",
  "customer_profiles",
  "customers",
  "deliveries",
  "food_statuses",
  "foods",
  "order_details",
  "order_status_history",
  "order_statuses",
  "orders",
  "payment_methods",
  "payment_statuses",
  "payments",
  "restaurant_statuses",
  "restaurants",
  "review_statuses",
  "reviews",
  "shipper_statuses",
  "shippers",
  "user_roles",
  "user_statuses",
  "users",
  "voucher_statuses",
  "vouchers"
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

const queryParameter = (name, description, schema = { type: "string" }) => ({
  name,
  in: "query",
  required: false,
  description,
  schema
});
const recordResponse = (description, status = 200) => ({
  [status]: response(description, { type: "object", additionalProperties: true }),
  400: response("Invalid request", { $ref: "#/components/schemas/Error" }),
  401: response("Authentication required", { $ref: "#/components/schemas/Error" }),
  403: response("Operation not allowed", { $ref: "#/components/schemas/Error" })
});
const idParameter = (resource) => ({
  name: "id",
  in: "path",
  required: true,
  description: `ID of the ${resource} record`,
  schema: { type: "integer", minimum: 1 }
});

paths["/api/restaurants"].get = {
  summary: "List restaurants visible to the authenticated actor",
  description: "Customer results include ACTIVE restaurants. Optional filters support name/address, category, food price, rating, opening state and distance.",
  parameters: [
    queryParameter("q", "Restaurant name or address"),
    queryParameter("categoryId", "Shared active category ID", { type: "integer", minimum: 1 }),
    queryParameter("minPrice", "Minimum available food price", { type: "number", minimum: 0 }),
    queryParameter("maxPrice", "Maximum available food price", { type: "number", minimum: 0 }),
    queryParameter("minRating", "Minimum visible-review average", { type: "number", minimum: 0, maximum: 5 }),
    queryParameter("isOpen", "Filter by current opening hours", { type: "boolean" }),
    queryParameter("latitude", "Search coordinate latitude", { type: "number", minimum: -90, maximum: 90 }),
    queryParameter("longitude", "Search coordinate longitude", { type: "number", minimum: -180, maximum: 180 }),
    queryParameter("maxDistanceKm", "Maximum distance from the supplied coordinates", { type: "number", minimum: 0.01 })
  ],
  responses: recordResponse("Restaurants returned")
};
paths["/api/restaurants/{id}"].get = {
  summary: "Get a restaurant visible to the authenticated actor",
  parameters: [idParameter("restaurant")],
  responses: recordResponse("Restaurant returned")
};
paths["/api/restaurants/{id}/categories"] = {
  get: {
    summary: "List active categories used by available foods in a restaurant",
    parameters: [idParameter("restaurant")],
    responses: recordResponse("Restaurant categories returned")
  }
};

paths["/api/categories"].get = {
  summary: "List active categories (Admin can also see inactive categories)",
  responses: recordResponse("Categories returned")
};
paths["/api/categories/{id}"].get = {
  summary: "Get an active category (Admin can also see inactive categories)",
  parameters: [idParameter("category")],
  responses: recordResponse("Category returned")
};
paths["/api/categories"].post.requestBody = { $ref: "#/components/requestBodies/Record" };
paths["/api/categories/{id}"].put.parameters = [idParameter("category")];
paths["/api/categories/{id}"].delete.parameters = [idParameter("category")];

paths["/api/foods"].get = {
  summary: "List foods visible to the authenticated actor",
  description: "Customer results contain only AVAILABLE foods from ACTIVE restaurants and active categories. Restaurant results are scoped to that restaurant.",
  parameters: [
    queryParameter("q", "Food name"),
    queryParameter("restaurantId", "Restaurant ID", { type: "integer", minimum: 1 }),
    queryParameter("categoryId", "Active shared category ID", { type: "integer", minimum: 1 }),
    queryParameter("minPrice", "Minimum price", { type: "number", minimum: 0 }),
    queryParameter("maxPrice", "Maximum price", { type: "number", minimum: 0 })
  ],
  responses: recordResponse("Foods returned")
};
paths["/api/foods/{id}"].get = {
  summary: "Get a food visible to the authenticated actor",
  parameters: [idParameter("food")],
  responses: recordResponse("Food returned")
};
paths["/api/foods/{id}"].put.parameters = [idParameter("food")];
paths["/api/foods/{id}"].delete.parameters = [idParameter("food")];

paths["/api/addresses"].get = {
  summary: "List the authenticated Customer's own addresses",
  responses: recordResponse("Addresses returned")
};
paths["/api/addresses"].post = {
  summary: "Create an address for the authenticated Customer",
  requestBody: { $ref: "#/components/requestBodies/Record" },
  responses: recordResponse("Address created", 201)
};
paths["/api/addresses/{id}"] = {
  parameters: [idParameter("address")],
  get: {
    summary: "Get an address owned by the authenticated Customer",
    responses: recordResponse("Address returned")
  },
  put: {
    summary: "Update an address owned by the authenticated Customer",
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: recordResponse("Address updated")
  },
  delete: {
    summary: "Delete an address owned by the authenticated Customer",
    responses: recordResponse("Address deleted")
  }
};

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "FoodDelivery Backend API",
    version: "1.0.0",
    description: "API documentation for testing the FoodDelivery backend."
  },
  servers: [{ url: "http://localhost:3000" }],
  security: [{ bearerAuth: [] }],
  tags: resources.map((name) => ({ name })),
  paths,
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
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
