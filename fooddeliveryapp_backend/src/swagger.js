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
      200: response("Record returned successfully", {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean" },
          data: { type: "object", additionalProperties: true }
        }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  put: {
    summary: `Update a ${resource} record`,
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: {
      200: response("Record updated successfully", {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" }
        }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  delete: {
    summary: `Delete a ${resource} record`,
    responses: {
      200: response("Record deleted successfully", {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" }
        }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  }
});

const collectionPath = (resource) => ({
  get: {
    summary: `Get all ${resource}`,
    responses: {
      200: response("Records returned successfully", {
        type: "object",
        required: ["success", "data"],
        properties: {
          success: { type: "boolean" },
          data: { type: "array", items: { type: "object" } }
        }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  },
  post: {
    summary: `Create a ${resource} record`,
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: {
      201: response("Record created successfully", {
        type: "object",
        required: ["success", "id"],
        properties: { success: { type: "boolean" }, id: { type: "integer" } }
      }),
      500: response("Database error", { $ref: "#/components/schemas/Error" })
    }
  }
});

const paths = {};
resources.forEach((resource) => {
  paths[`/api/${resource}`] = collectionPath(resource);
  paths[`/api/${resource}/{id}`] = itemPath(resource);
});
delete paths["/api/carts/{id}"];
const readOnlyResources = [
  "admins", "customer_profiles", "customers", "deliveries", "food_statuses",
  "order_details", "order_status_history", "order_statuses", "payment_methods",
  "payment_statuses", "payments", "restaurant_statuses", "restaurants",
  "review_statuses", "reviews", "shipper_statuses", "shippers", "user_roles",
  "user_statuses", "users", "voucher_statuses"
];
for (const resource of readOnlyResources) {
  delete paths[`/api/${resource}`].post;
  delete paths[`/api/${resource}/{id}`].put;
  delete paths[`/api/${resource}/{id}`].delete;
}

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
    queryParameter("minRating", "Minimum average of visible reviews", { type: "number", minimum: 0, maximum: 5 }),
    queryParameter("isOpen", "Filter by current opening hours", { type: "boolean" }),
    queryParameter("latitude", "Search coordinate latitude", { type: "number", minimum: -90, maximum: 90 }),
    queryParameter("longitude", "Search coordinate longitude", { type: "number", minimum: -180, maximum: 180 }),
    queryParameter("maxDistanceKm", "Maximum distance from the supplied coordinates", { type: "number", minimum: 0.01 })
  ],
  responses: recordResponse("Restaurants returned")
};
paths["/api/restaurants/me"] = {
  get: {
    summary: "Get the authenticated Restaurant's own business profile",
    responses: recordResponse("Restaurant profile returned")
  },
  patch: {
    summary: "Update editable fields on the authenticated Restaurant's own profile",
    description: "Restaurant ID and status are derived from the authenticated account and cannot be supplied in the request.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            minProperties: 1,
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1, maxLength: 150 },
              address: { type: "string", minLength: 1, maxLength: 255 },
              phone: { type: "string", pattern: "^\\+?[0-9]{8,15}$" },
              description: { type: ["string", "null"], maxLength: 2000 },
              latitude: { type: "number", minimum: -90, maximum: 90 },
              longitude: { type: "number", minimum: -180, maximum: 180 },
              opening_time: { type: ["string", "null"], pattern: "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$" },
              closing_time: { type: ["string", "null"], pattern: "^([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d)?$" }
            }
          }
        }
      }
    },
    responses: recordResponse("Restaurant profile updated")
  }
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

const imageRequestBody = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["image"],
        properties: {
          image: {
            type: "string",
            format: "binary",
            description: "One JPEG, PNG, or WEBP image; maximum size 5 MiB."
          }
        },
        additionalProperties: false
      },
      encoding: {
        image: { contentType: "image/jpeg, image/png, image/webp" }
      }
    }
  }
};
const imageUploadResponses = (entity) => ({
  200: response("Image stored and resource image path updated", {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        required: ["image"],
        properties: {
          image: {
            type: "string",
            example: `/uploads/${entity}/1720000000000-00000000-0000-4000-8000-000000000000.jpg`
          }
        }
      }
    }
  }),
  400: response("File missing, invalid ID, or malformed upload", { $ref: "#/components/schemas/Error" }),
  401: response("Authentication required", { $ref: "#/components/schemas/Error" }),
  403: response("Role or ownership does not permit image management", { $ref: "#/components/schemas/Error" }),
  404: response("Resource not found", { $ref: "#/components/schemas/Error" }),
  413: response("Image exceeds 5 MiB", { $ref: "#/components/schemas/Error" }),
  415: response("Unsupported extension, MIME type, or image signature", { $ref: "#/components/schemas/Error" }),
  500: response("Image storage or database operation failed", { $ref: "#/components/schemas/Error" })
});
const imageDeleteResponses = {
  200: response("Image reference cleared and managed file removed", {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean" },
      data: {
        type: "object",
        required: ["image"],
        properties: { image: { type: "string", nullable: true, example: null } }
      }
    }
  }),
  400: response("Invalid resource ID", { $ref: "#/components/schemas/Error" }),
  401: response("Authentication required", { $ref: "#/components/schemas/Error" }),
  403: response("Role or ownership does not permit image management", { $ref: "#/components/schemas/Error" }),
  404: response("Resource not found", { $ref: "#/components/schemas/Error" }),
  500: response("Database operation failed", { $ref: "#/components/schemas/Error" })
};
paths["/api/restaurants/{id}/image"] = {
  parameters: [idParameter("restaurant")],
  put: {
    tags: ["restaurants"],
    summary: "Upload or replace a Restaurant image",
    description: "Restaurant owner or Admin only. New file is stored before the DB path is updated; the previous managed file is removed after commit.",
    security: [{ bearerAuth: [] }],
    requestBody: imageRequestBody,
    responses: imageUploadResponses("restaurants")
  },
  delete: {
    tags: ["restaurants"],
    summary: "Remove a Restaurant image",
    description: "Restaurant owner or Admin only. Clears restaurants.image, then removes the managed local file.",
    security: [{ bearerAuth: [] }],
    responses: imageDeleteResponses
  }
};
paths["/api/foods/{id}/image"] = {
  parameters: [idParameter("food")],
  put: {
    tags: ["foods"],
    summary: "Upload or replace a Food image",
    description: "Only the owning Restaurant may manage the Food image.",
    security: [{ bearerAuth: [] }],
    requestBody: imageRequestBody,
    responses: imageUploadResponses("foods")
  },
  delete: {
    tags: ["foods"],
    summary: "Remove a Food image",
    description: "Only the owning Restaurant may remove the Food image.",
    security: [{ bearerAuth: [] }],
    responses: imageDeleteResponses
  }
};

paths["/api/addresses"].get = {
  summary: "List the authenticated Customer's own addresses",
  responses: recordResponse("Addresses returned")
};
paths["/api/addresses"].post = {
  summary: "Create an address for the authenticated Customer (maximum three addresses)",
  requestBody: { $ref: "#/components/requestBodies/Record" },
  responses: {
    ...recordResponse("Address created", 201),
    409: response("Customer already has three saved addresses", {
      $ref: "#/components/schemas/Error"
    })
  }
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

paths["/api/carts"] = {
  get: {
    summary: "Get or initialize the authenticated Customer's cart",
    responses: recordResponse("Cart with items and calculated subtotal")
  },
  delete: {
    summary: "Clear the authenticated Customer's cart",
    responses: recordResponse("Cart cleared")
  }
};
paths["/api/cart_items"] = {
  post: {
    summary: "Add available food to the authenticated Customer's cart",
    description: "food_id and quantity are required. Price and restaurant are taken from the database. A cart cannot mix restaurants.",
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: recordResponse("Cart updated")
  }
};
paths["/api/cart_items/{id}"] = {
  parameters: [idParameter("cart item")],
  patch: {
    summary: "Update a cart item's quantity",
    requestBody: { $ref: "#/components/requestBodies/Record" },
    responses: recordResponse("Cart item updated")
  },
  delete: {
    summary: "Remove a cart item",
    responses: recordResponse("Cart item removed")
  }
};
paths["/api/orders"] = {
  get: {
    summary: "List the authenticated Customer's orders or Restaurant-owned orders",
    description: "Optional status filter uses an existing Order status. Results are always scoped to the Customer or authenticated Restaurant.",
    parameters: [
      queryParameter("status", "Filter by an existing Order status", {
        type: "string",
        enum: ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERING", "COMPLETED", "CANCELLED", "REJECTED"]
      })
    ],
    responses: recordResponse("Orders returned")
  }
};
paths["/api/orders/quote"] = {
  post: {
    summary: "Preview totals for the authenticated Customer's current cart",
    description: "Requires address_id and optional voucher_code. Uses the same server-side price, delivery-fee and voucher rules as checkout without creating an Order or consuming voucher usage.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["address_id"],
            properties: {
              address_id: { type: "integer", minimum: 1 },
              note: { type: "string", maxLength: 255 },
              voucher_code: { type: "string", minLength: 1, maxLength: 50 }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Checkout quote returned")
  }
};
paths["/api/orders/checkout"] = {
  post: {
    summary: "Create an Order from the authenticated Customer's current cart",
    description: "Requires address_id and optional note or voucher_code. Prices, discount, delivery fee and total are calculated server-side.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["address_id"],
            properties: {
              address_id: { type: "integer", minimum: 1 },
              note: { type: "string", maxLength: 255 },
              voucher_code: { type: "string", minLength: 1, maxLength: 50 }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Order created", 201)
  }
};
paths["/api/orders/{id}"] = {
  parameters: [idParameter("order")],
  get: {
    summary: "Get an order owned by the authenticated Customer or Restaurant",
    description: "Customer detail includes COD payment and delivery summary; Customer and owning Restaurant can see status history.",
    responses: recordResponse("Order returned")
  }
};
paths["/api/orders/{id}/history"] = {
  parameters: [idParameter("order")],
  get: {
    summary: "List status history for an owned order",
    description: "Available to the owning Customer or Restaurant. History entries include status, actor and database timestamp.",
    responses: recordResponse("Order history returned")
  }
};
for (const [action, summary] of [
  ["confirm", "Confirm a PENDING order (owning Restaurant only)"],
  ["reject", "Reject a PENDING order (owning Restaurant only)"],
  ["prepare", "Move a CONFIRMED order to PREPARING (owning Restaurant only)"],
  ["ready-for-pickup", "Move a PREPARING order to READY_FOR_PICKUP (owning Restaurant only)"],
  ["cancel", "Cancel a PENDING order (owning Customer only)"]
]) {
  paths[`/api/orders/{id}/${action}`] = {
    parameters: [idParameter("order")],
    post: {
      summary,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { note: { type: "string", maxLength: 255 } },
              additionalProperties: false
            }
          }
        }
      },
      responses: recordResponse("Order transition applied")
    }
  };
}

paths["/api/reviews"] = {
  get: {
    summary: "List and filter all Reviews (Admin only)",
    parameters: [
      queryParameter("status", "Filter by moderation status", {
        type: "string",
        enum: ["VISIBLE", "HIDDEN", "PENDING"]
      })
    ],
    responses: recordResponse("Reviews returned")
  },
  post: {
    summary: "Create a Review for the authenticated Customer's completed Order",
    description: "One Review per Order. Reviews are VISIBLE immediately; Admin may hide or restore a review that violates community rules.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["order_id", "rating"],
            properties: {
              order_id: { type: "integer", minimum: 1 },
              rating: { type: "integer", minimum: 1, maximum: 5 },
              comment: { type: "string", maxLength: 1000, nullable: true }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Review created", 201)
  }
};
paths["/api/reviews/mine"] = {
  get: {
    summary: "List Reviews created by the authenticated Customer",
    responses: recordResponse("Customer Reviews returned")
  }
};
paths["/api/reviews/restaurant/mine"] = {
  get: {
    summary: "List visible Reviews for the authenticated Restaurant's Orders",
    description: "Legacy PENDING reviews are treated as visible.",
    responses: recordResponse("Restaurant Reviews returned")
  }
};
paths["/api/reviews/restaurant/{restaurantId}"] = {
  parameters: [{
    name: "restaurantId",
    in: "path",
    required: true,
    schema: { type: "integer", minimum: 1 }
  }],
  get: {
    summary: "List public Reviews for a Restaurant (Customer only)",
    description: "Returns VISIBLE reviews and legacy PENDING reviews, without customer identifiers.",
    responses: recordResponse("Public Restaurant Reviews returned")
  }
};
paths["/api/reviews/{id}"] = {
  parameters: [idParameter("review")],
  get: {
    summary: "Get a Review as its Customer, related Restaurant, or Admin",
    responses: recordResponse("Review returned")
  }
};
paths["/api/reviews/{id}/status"] = {
  parameters: [idParameter("review")],
  patch: {
    summary: "Set a Review to VISIBLE or HIDDEN (Admin only)",
    description: "Moderation may change status only; Review content is not editable by Admin.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["VISIBLE", "HIDDEN"] } },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Review moderated")
  }
};
paths["/api/vouchers"] = {
  get: {
    summary: "List Vouchers (Admin only)",
    responses: recordResponse("Vouchers returned")
  },
  post: {
    summary: "Create a fixed-amount Voucher (Admin only)",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["code", "discount_value", "min_order_value", "usage_limit", "status", "start_date", "end_date"],
            properties: {
              code: { type: "string", maxLength: 50 },
              discount_value: { type: "number", exclusiveMinimum: 0 },
              min_order_value: { type: "number", minimum: 0 },
              usage_limit: { type: "integer", minimum: 1 },
              status: { type: "string", enum: ["ACTIVE", "INACTIVE", "EXPIRED"] },
              start_date: { type: "string", description: "YYYY-MM-DD HH:mm:ss" },
              end_date: { type: "string", description: "YYYY-MM-DD HH:mm:ss" }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Voucher created", 201)
  }
};
paths["/api/vouchers/available"] = {
  get: {
    summary: "List active Vouchers with global usage counts and customer redemption status",
    description: "Each customer may redeem a voucher only once. Checkout and the quote endpoint both enforce this rule.",
    responses: recordResponse("Available Vouchers returned")
  }
};
paths["/api/vouchers/{id}"] = {
  parameters: [idParameter("voucher")],
  get: {
    summary: "Get Voucher configuration (Admin only)",
    responses: recordResponse("Voucher returned")
  },
  put: {
    summary: "Replace Voucher configuration (Admin only)",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["code", "discount_value", "min_order_value", "usage_limit", "status", "start_date", "end_date"],
            properties: {
              code: { type: "string", maxLength: 50 },
              discount_value: { type: "number", exclusiveMinimum: 0 },
              min_order_value: { type: "number", minimum: 0 },
              usage_limit: { type: "integer", minimum: 1 },
              status: { type: "string", enum: ["ACTIVE", "INACTIVE", "EXPIRED"] },
              start_date: { type: "string", description: "YYYY-MM-DD HH:mm:ss" },
              end_date: { type: "string", description: "YYYY-MM-DD HH:mm:ss" }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Voucher updated")
  },
  delete: {
    summary: "Delete an unused Voucher not linked to an Order (Admin only)",
    responses: recordResponse("Voucher deleted")
  }
};

paths["/api/deliveries"] = {};
paths["/api/deliveries/me/status"] = {
  patch: {
    summary: "Set the authenticated Shipper's availability",
    description: "Only ONLINE or OFFLINE may be requested. BUSY is managed by delivery assignment and completion.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["status"],
            properties: { status: { type: "string", enum: ["ONLINE", "OFFLINE"] } },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Shipper availability updated")
  }
};
paths["/api/deliveries/available"] = {
  get: {
    summary: "List ready, unassigned deliveries for an ONLINE or BUSY Shipper",
    responses: recordResponse("Available deliveries returned")
  }
};
paths["/api/deliveries/mine"] = {
  get: {
    summary: "List active deliveries assigned to the authenticated Shipper",
    responses: recordResponse("Assigned deliveries returned")
  }
};
paths["/api/deliveries/history"] = {
  get: {
    summary: "List completed or cancelled deliveries assigned to the authenticated Shipper",
    responses: recordResponse("Shipper delivery history returned")
  }
};
paths["/api/deliveries/orders/{orderId}"] = {
  parameters: [{ ...idParameter("order"), name: "orderId" }],
  get: {
    summary: "Track delivery status for an owned Order",
    description: "Customer and Restaurant see delivery/order statuses and timestamps only. A Shipper must be assigned to the Order.",
    responses: recordResponse("Delivery tracking returned")
  }
};
paths["/api/deliveries/{id}"] = {
  parameters: [idParameter("delivery")],
  get: {
    summary: "Get details for a delivery assigned to the authenticated Shipper",
    responses: recordResponse("Assigned delivery returned")
  }
};
for (const [action, summary] of [
  ["accept", "Accept an available READY_FOR_PICKUP Order"],
  ["pickup", "Confirm pickup of an assigned Order"],
  ["start", "Start delivery of an assigned Order"],
  ["complete", "Complete delivery and confirm its pending COD payment"]
]) {
  paths[`/api/deliveries/{deliveryId}/${action}`] = {
    parameters: [{ ...idParameter("delivery"), name: "deliveryId" }],
    post: {
      summary,
      description: "The authenticated Shipper identity is resolved from the verified JWT and current account data; request bodies and client-supplied amounts are not accepted.",
      responses: recordResponse("Delivery transition applied")
    }
  };
}

const envelope = (data = { type: "object", additionalProperties: true }) => ({
  type: "object",
  required: ["success", "data"],
  properties: {
    success: { type: "boolean", enum: [true] },
    data
  },
  additionalProperties: true
});
const adminResponses = (description, data) => ({
  200: response(description, envelope(data)),
  400: response("Validation error", { $ref: "#/components/schemas/Error" }),
  401: response("Authentication required", { $ref: "#/components/schemas/Error" }),
  403: response("Administrator role required", { $ref: "#/components/schemas/Error" }),
  404: response("Record not found", { $ref: "#/components/schemas/Error" }),
  409: response("State transition or data conflict", { $ref: "#/components/schemas/Error" }),
  500: response("Internal server error", { $ref: "#/components/schemas/Error" })
});
const adminIdPath = (name) => ({
  parameters: [{
    name: "id",
    in: "path",
    required: true,
    schema: { type: "integer", minimum: 1 },
    description: `${name} ID`
  }]
});
const adminListParameters = (statuses) => [
  queryParameter("q", "Search by name, phone, address, email, or Order code"),
  ...(statuses ? [queryParameter("status", "Filter by status", { type: "string", enum: statuses })] : [])
];
const statusRequest = (statuses) => ({
  required: true,
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: statuses } },
        additionalProperties: false
      }
    }
  }
});
const adminCollection = (summary, parameters, itemType = "object") => ({
  get: {
    tags: ["Admin"],
    summary,
    description: "Admin only. List results exclude password hashes.",
    parameters,
    responses: adminResponses("Records returned", {
      type: "array",
      items: { type: itemType, additionalProperties: true }
    }),
    security: [{ bearerAuth: [] }]
  }
});
const adminDetail = (summary, itemName) => ({
  get: {
    tags: ["Admin"],
    summary,
    description: "Admin only. User credential hashes are never returned.",
    responses: adminResponses(`${itemName} returned`),
    security: [{ bearerAuth: [] }]
  }
});

for (const [path, summary, statuses] of [
  ["/api/admin/customers", "List Customers", ["ACTIVE", "LOCKED"]],
  ["/api/admin/restaurants", "List Restaurants", ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"]],
  ["/api/admin/shippers", "List Shippers", ["ACTIVE", "LOCKED"]],
  ["/api/admin/orders", "Monitor Orders", ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERING", "COMPLETED", "CANCELLED", "REJECTED"]]
]) {
  const parameters = adminListParameters(statuses);
  if (path.endsWith("/orders")) {
    parameters.push(
      queryParameter("from", "Include Orders created on or after this date (YYYY-MM-DD)"),
      queryParameter("to", "Include Orders created through this date (YYYY-MM-DD)")
    );
  }
  paths[path] = adminCollection(summary, parameters);
}

for (const [path, summary, itemName, statuses, action] of [
  ["/api/admin/customers/{id}", "Get Customer", "Customer", ["ACTIVE", "LOCKED"], "status"],
  ["/api/admin/restaurants/{id}", "Get Restaurant", "Restaurant", ["ACTIVE", "PENDING", "REJECTED", "SUSPENDED"], "status"],
  ["/api/admin/shippers/{id}", "Get Shipper", "Shipper", ["ACTIVE", "LOCKED"], "account-status"]
]) {
  paths[path] = { ...adminIdPath(itemName), ...adminDetail(summary, itemName) };
  paths[`/api/admin/${itemName.toLowerCase()}s/{id}/${action}`] = {
    ...adminIdPath(itemName),
    patch: {
      tags: ["Admin"],
      summary: `Update ${itemName} ${action}`,
      description: "Admin only. Shipper availability is not modified by account status operations.",
      requestBody: statusRequest(statuses),
      responses: adminResponses(`${itemName} status updated`),
      security: [{ bearerAuth: [] }]
    }
  };
}
paths["/api/admin/shippers/{id}/account-status"] = {
  ...adminIdPath("Shipper"),
  patch: {
    tags: ["Admin"],
    summary: "Lock or unlock a Shipper account",
    description: "Admin only. Shipper availability is not changed. A Shipper with an active delivery cannot be locked.",
    requestBody: statusRequest(["ACTIVE", "LOCKED"]),
    responses: adminResponses("Shipper account status updated"),
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/admin/shippers"].get.parameters = [
  queryParameter("q", "Search by name, phone, or email"),
  queryParameter("accountStatus", "Filter by account status", { type: "string", enum: ["ACTIVE", "LOCKED"] }),
  queryParameter("availability", "Filter by availability", { type: "string", enum: ["OFFLINE", "ONLINE", "BUSY"] })
];
paths["/api/admin/orders"].get.description =
  "Admin only. Returns up to the latest 500 matching Orders; use status, date, and text filters to narrow the list.";
paths["/api/admin/orders/{id}"] = {
  ...adminIdPath("Order"),
  ...adminDetail("Get Order with items, payment, delivery and history", "Order")
};
paths["/api/reports/admin/summary"] = {
  get: {
    tags: ["Reports"],
    summary: "Get Admin dashboard counts and today's orders/revenue",
    responses: adminResponses("Dashboard summary returned"),
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/reports/admin/revenue"] = {
  get: {
    tags: ["Reports"],
    summary: "Get completed Order revenue by day or month",
    description: "Admin only. Revenue is the sum of completed Order subtotals and excludes delivery fees.",
    parameters: [
      queryParameter("from", "Start date inclusive (YYYY-MM-DD)"),
      queryParameter("to", "End date inclusive (YYYY-MM-DD)"),
      queryParameter("groupBy", "Aggregation interval", { type: "string", enum: ["day", "month"] })
    ],
    responses: adminResponses("Revenue report returned", { type: "array", items: { type: "object" } }),
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/reports/restaurant/revenue"] = {
  get: {
    tags: ["Reports"],
    summary: "Get the authenticated Restaurant's completed Order revenue",
    description: "Restaurant role only. Results are scoped to the authenticated Restaurant and exclude delivery fees.",
    parameters: [
      queryParameter("from", "Start date inclusive (YYYY-MM-DD)"),
      queryParameter("to", "End date inclusive (YYYY-MM-DD)"),
      queryParameter("groupBy", "Aggregation interval", { type: "string", enum: ["day", "week", "month"] })
    ],
    responses: {
      200: response("Revenue report returned", envelope({ type: "array", items: { type: "object" } })),
      400: response("Validation error", { $ref: "#/components/schemas/Error" }),
      401: response("Authentication required", { $ref: "#/components/schemas/Error" }),
      403: response("Restaurant role required", { $ref: "#/components/schemas/Error" })
    },
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/auth/register"] = {
  post: {
    tags: ["Auth"],
    summary: "Register a Customer account",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email", "password", "fullName", "phone"],
            properties: {
              email: { type: "string", format: "email", maxLength: 150 },
              password: { type: "string", minLength: 8, maxLength: 72 },
              fullName: { type: "string", minLength: 1, maxLength: 100 },
              phone: { type: "string", pattern: "^\\+?[0-9]{8,15}$" },
              dateOfBirth: { type: "string", format: "date", nullable: true }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Account created", 201)
  }
};
paths["/api/auth/login"] = {
  post: {
    tags: ["Auth"],
    summary: "Authenticate with email and password and receive a JWT",
    description: "Stateless JWT authentication. Multiple tokens for the same account may remain valid concurrently until expiration or account-status rejection.",
    security: [],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", minLength: 8, maxLength: 72 }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: {
      200: response("JWT issued", envelope({
        type: "object",
        required: ["token", "expiresIn", "user"],
        properties: {
          token: { type: "string" },
          expiresIn: { type: "integer", example: 3600 },
          user: { type: "object", additionalProperties: true }
        }
      })),
      400: response("Validation error", { $ref: "#/components/schemas/Error" }),
      401: response("Invalid credentials", { $ref: "#/components/schemas/Error" }),
      403: response("Account is locked or inactive", { $ref: "#/components/schemas/Error" })
    }
  }
};
paths["/api/auth/me"] = {
  get: {
    tags: ["Auth"],
    summary: "Get the authenticated account profile",
    responses: recordResponse("Profile returned"),
    security: [{ bearerAuth: [] }]
  },
  patch: {
    tags: ["Auth"],
    summary: "Update the authenticated account profile",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            minProperties: 1,
            properties: {
              email: { type: "string", format: "email", maxLength: 150 },
              fullName: { type: "string", minLength: 1, maxLength: 100 },
              phone: { type: "string", pattern: "^\\+?[0-9]{8,15}$" },
              dateOfBirth: { type: "string", format: "date", nullable: true }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: recordResponse("Profile updated"),
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/auth/logout"] = {
  post: {
    tags: ["Auth"],
    summary: "Confirm logout for the authenticated JWT",
    description: "Stateless logout does not revoke the JWT server-side. The client must delete the token; it remains valid until expiration or account-status rejection.",
    responses: {
      200: response("Logout acknowledged; client token must be discarded", {
        type: "object",
        required: ["success", "message"],
        properties: { success: { type: "boolean" }, message: { type: "string" } }
      }),
      401: response("Authentication required", { $ref: "#/components/schemas/Error" })
    },
    security: [{ bearerAuth: [] }]
  }
};
paths["/api/auth/change-password"] = {
  post: {
    tags: ["Auth"],
    summary: "Change the authenticated account password",
    description: "Checks the current password and updates its hash. Existing stateless JWTs are not revoked and remain valid until expiration or account-status rejection.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["currentPassword", "newPassword"],
            properties: {
              currentPassword: { type: "string", minLength: 8, maxLength: 72 },
              newPassword: { type: "string", minLength: 8, maxLength: 72 }
            },
            additionalProperties: false
          }
        }
      }
    },
    responses: {
      200: response("Password changed", {
        type: "object",
        required: ["success", "message"],
        properties: { success: { type: "boolean" }, message: { type: "string" } }
      }),
      400: response("Validation error", { $ref: "#/components/schemas/Error" }),
      401: response("Authentication required", { $ref: "#/components/schemas/Error" })
    },
    security: [{ bearerAuth: [] }]
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
  tags: [...resources.map((name) => ({ name })), { name: "Auth" }, { name: "Admin" }, { name: "Reports" }],
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
        required: ["success", "message", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          error: { type: "string" }
        },
        additionalProperties: false
      }
    }
  }
};
