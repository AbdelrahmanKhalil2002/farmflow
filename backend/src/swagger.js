const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'FarmFlow API',
    version: '1.0.0',
    description:
      'Egyptian livestock marketplace API. Three roles: **seller** (farm owner), **buyer**, **admin**. ' +
      'All protected routes require a Bearer JWT obtained from `POST /api/auth/login`.',
    contact: { name: 'FarmFlow', email: 'a.khalil@soar.inc' },
  },
  servers: [
    { url: 'https://api.مزرعتي.com', description: 'Production' },
    { url: 'http://localhost:5001', description: 'Local development' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      // ── Primitives ──────────────────────────────────────────────────────────
      MongoId: { type: 'string', pattern: '^[a-f\\d]{24}$', example: '6641a2f3e4b01234567890ab' },
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      ValidationError: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: { type: 'object', properties: { msg: { type: 'string' }, path: { type: 'string' } } },
          },
        },
      },

      // ── Auth ────────────────────────────────────────────────────────────────
      AuthToken: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/UserPublic' },
        },
      },
      UserPublic: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['buyer', 'seller', 'admin'] },
          farmName: { type: 'string' },
          governorate: { type: 'string' },
          averageRating: { type: 'number' },
          reviewCount: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      NotifPrefs: {
        type: 'object',
        properties: {
          orders: { type: 'boolean' },
          reminders: { type: 'boolean' },
          dairy: { type: 'boolean' },
          messages: { type: 'boolean' },
        },
      },

      // ── Listing ─────────────────────────────────────────────────────────────
      Listing: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/UserPublic' },
          type: { type: 'string', enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other'] },
          breed: { type: 'string' },
          age: { type: 'number', description: 'Age in months' },
          weight: { type: 'number', description: 'Weight in kg' },
          price: { type: 'number' },
          pricePerKg: { type: 'number' },
          status: { type: 'string', enum: ['draft','pending','approved','rejected','sold'] },
          deliveryType: { type: 'string', enum: ['none','farm','admin'] },
          deliveryCost: { type: 'number' },
          images: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ListingInput: {
        type: 'object',
        required: ['type', 'age', 'weight', 'price'],
        properties: {
          type: { type: 'string', enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other'] },
          breed: { type: 'string' },
          age: { type: 'number' },
          weight: { type: 'number' },
          price: { type: 'number' },
          pricePerKg: { type: 'number' },
          deliveryType: { type: 'string', enum: ['none','farm','admin'] },
          deliveryCost: { type: 'number' },
          description: { type: 'string' },
        },
      },

      // ── Animal ──────────────────────────────────────────────────────────────
      Animal: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/MongoId' },
          type: { type: 'string', enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other'] },
          breed: { type: 'string' },
          gender: { type: 'string', enum: ['male','female','unknown'] },
          tagId: { type: 'string' },
          dob: { type: 'string', format: 'date' },
          currentWeight: { type: 'number' },
          targetWeight: { type: 'number' },
          healthStatus: { type: 'string', enum: ['healthy','sick','quarantine','deceased'] },
          status: { type: 'string', enum: ['active','sold','deceased'] },
          pregnancyStatus: { type: 'string', enum: ['none','pregnant','recently_gave_birth'] },
          weightLog: { type: 'array', items: { type: 'object', properties: { weightKg: { type: 'number' }, date: { type: 'string', format: 'date-time' }, notes: { type: 'string' } } } },
          vaccinationLog: { type: 'array', items: { type: 'object', properties: { vaccine: { type: 'string' }, date: { type: 'string', format: 'date-time' }, nextDueDate: { type: 'string', format: 'date-time' }, vet: { type: 'string' } } } },
          images: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      HerdSummary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          byType: { type: 'object', additionalProperties: { type: 'integer' } },
          avgAgeMonths: { type: 'number', nullable: true },
          avgWeightKg: { type: 'number', nullable: true },
        },
      },
      MedicalRecord: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          animal: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/MongoId' },
          date: { type: 'string', format: 'date-time' },
          diagnosis: { type: 'string' },
          treatment: { type: 'string' },
          medication: { type: 'string' },
          vet: { type: 'string' },
          cost: { type: 'number' },
          followUpDate: { type: 'string', format: 'date-time' },
          resolved: { type: 'boolean' },
        },
      },

      // ── Order ───────────────────────────────────────────────────────────────
      Order: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          buyer: { $ref: '#/components/schemas/UserPublic' },
          seller: { $ref: '#/components/schemas/UserPublic' },
          listing: { $ref: '#/components/schemas/MongoId' },
          supply: { $ref: '#/components/schemas/MongoId' },
          quantity: { type: 'integer' },
          totalAmount: { type: 'number' },
          paymentType: { type: 'string', enum: ['deposit','cod','instapay'] },
          depositAmount: { type: 'number' },
          status: { type: 'string', enum: ['pending','confirmed','completed','cancelled'] },
          deliveryStatus: { type: 'string', enum: ['pending','in_transit','delivered'] },
          deliveryCost: { type: 'number' },
          notes: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Finance ─────────────────────────────────────────────────────────────
      Expense: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/MongoId' },
          category: { type: 'string', enum: ['feed','doctor','transport','electricity','salary','rent','water','maintenance','other'] },
          amount: { type: 'number' },
          date: { type: 'string', format: 'date-time' },
          note: { type: 'string' },
        },
      },
      Income: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/MongoId' },
          type: { type: 'string', enum: ['sale','deposit'] },
          amount: { type: 'number' },
          date: { type: 'string', format: 'date-time' },
          note: { type: 'string' },
        },
      },
      FinanceSummary: {
        type: 'object',
        properties: {
          totalExpenses: { type: 'number' },
          totalIncome: { type: 'number' },
          profit: { type: 'number' },
          expensesByCategory: { type: 'object', additionalProperties: { type: 'number' } },
        },
      },

      // ── Dairy ───────────────────────────────────────────────────────────────
      DairyProduct: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/UserPublic' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['milk','cheese','yogurt','butter','cream','ghee','other'] },
          quantity: { type: 'number' },
          unit: { type: 'string', enum: ['kg','liter','piece','pack','dozen'] },
          pricePerUnit: { type: 'number' },
          status: { type: 'string', enum: ['pending','approved','rejected'] },
          images: { type: 'array', items: { type: 'string' } },
        },
      },

      // ── Supply ──────────────────────────────────────────────────────────────
      Supply: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/UserPublic' },
          name: { type: 'string' },
          category: { type: 'string', enum: ['feed','veterinary','equipment','seeds','other'] },
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: 'string' },
          pricePerUnit: { type: 'number' },
          minOrderQty: { type: 'integer' },
          status: { type: 'string', enum: ['pending','approved','rejected','sold_out'] },
          deliveryAvailable: { type: 'boolean' },
          deliveryCost: { type: 'number' },
          images: { type: 'array', items: { type: 'string' } },
        },
      },

      // ── Review ──────────────────────────────────────────────────────────────
      Review: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          buyer: { $ref: '#/components/schemas/UserPublic' },
          seller: { $ref: '#/components/schemas/MongoId' },
          order: { $ref: '#/components/schemas/MongoId' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string' },
          reply: { type: 'object', properties: { body: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Notification ────────────────────────────────────────────────────────
      Notification: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          user: { $ref: '#/components/schemas/MongoId' },
          type: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          link: { type: 'string' },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Message / Conversation ───────────────────────────────────────────────
      Conversation: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          participants: { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } },
          lastMessage: { type: 'string' },
          unreadCount: { type: 'integer' },
          contextType: { type: 'string', enum: ['listing','order','general'] },
          contextLabel: { type: 'string' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          conversation: { $ref: '#/components/schemas/MongoId' },
          sender: { $ref: '#/components/schemas/UserPublic' },
          body: { type: 'string' },
          type: { type: 'string', enum: ['text','offer'] },
          offerAmount: { type: 'number' },
          offerStatus: { type: 'string', enum: ['pending','accepted','rejected','countered'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ── Budget ──────────────────────────────────────────────────────────────
      Budget: {
        type: 'object',
        properties: {
          _id: { $ref: '#/components/schemas/MongoId' },
          seller: { $ref: '#/components/schemas/MongoId' },
          year: { type: 'integer' },
          month: { type: 'integer', minimum: 1, maximum: 12 },
          category: { type: 'string' },
          targetAmount: { type: 'number' },
        },
      },
    },

    // ── Reusable parameters ─────────────────────────────────────────────────
    parameters: {
      IdParam: { name: 'id', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } },
      FromQuery: { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start date filter (ISO 8601)' },
      ToQuery: { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End date filter (ISO 8601)' },
    },

    // ── Reusable responses ─────────────────────────────────────────────────
    responses: {
      Unauthorized: { description: 'Missing or invalid JWT', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Forbidden:    { description: 'Insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound:     { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      BadRequest:   { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
      NoContent:    { description: 'Deleted successfully (no body)' },
    },
  },

  // ── Security default (can be overridden per-route) ────────────────────────
  security: [{ bearerAuth: [] }],

  tags: [
    { name: 'Auth',          description: 'Register, login, profile' },
    { name: 'Listings',      description: 'Livestock listings (buyer browse + seller manage)' },
    { name: 'Animals',       description: 'Seller herd management (private to seller)' },
    { name: 'Orders',        description: 'Purchase orders' },
    { name: 'Finance',       description: 'Expenses, income, and analytics (seller)' },
    { name: 'Dairy',         description: 'Dairy products marketplace' },
    { name: 'Supplies',      description: 'Farm supplies marketplace' },
    { name: 'Reviews',       description: 'Seller ratings and reviews' },
    { name: 'Notifications', description: 'In-app notification inbox' },
    { name: 'Messages',      description: 'Buyer ↔ seller conversations and offers' },
    { name: 'Favorites',     description: 'Buyer saved farms (buyer only)' },
    { name: 'Budget',        description: 'Monthly budget targets (seller only)' },
    { name: 'Admin',         description: 'Admin-only platform management' },
    { name: 'Misc',          description: 'Health check, market prices, EID config' },
  ],

  paths: {

    // ────────────────────────────────────────────────────────────────────────
    // AUTH
    // ────────────────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a new buyer or seller', security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'password', 'nationalId'],
                properties: {
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['buyer', 'seller'], default: 'buyer' },
                  email: { type: 'string', format: 'email', description: 'Required for buyers' },
                  phone: { type: 'string', description: 'Required for buyers' },
                  farmName: { type: 'string', description: 'Required for sellers' },
                  farmPhone: { type: 'string', description: 'Required for sellers' },
                  personalPhone: { type: 'string', description: 'Required for sellers' },
                  nationalId: { type: 'string', minLength: 14, maxLength: 14 },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login with email/phone + password', security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['identifier', 'password'],
                properties: {
                  identifier: { type: 'string', description: 'Email address or phone number' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthToken' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'], summary: 'Get the current authenticated user',
        responses: {
          200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPublic' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/profile': {
      put: {
        tags: ['Auth'], summary: 'Update profile (multipart/form-data for farmBanner upload)',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  bio: { type: 'string' },
                  governorate: { type: 'string' },
                  phone: { type: 'string' },
                  farmBanner: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPublic' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/password': {
      put: {
        tags: ['Auth'], summary: 'Change password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/fcm-token': {
      patch: {
        tags: ['Auth'], summary: 'Register or refresh FCM push token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'Token saved', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/notif-prefs': {
      get: {
        tags: ['Auth'], summary: 'Get notification preferences',
        responses: {
          200: { description: 'Preferences', content: { 'application/json': { schema: { $ref: '#/components/schemas/NotifPrefs' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Auth'], summary: 'Update notification preferences',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/NotifPrefs' } } },
        },
        responses: {
          200: { description: 'Saved', content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/verify-id': {
      post: {
        tags: ['Auth'], summary: 'Validate an Egyptian National ID (14 digits)', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['nationalId'], properties: { nationalId: { type: 'string', minLength: 14, maxLength: 14 } } } } },
        },
        responses: {
          200: { description: 'Parsed ID info', content: { 'application/json': { schema: { type: 'object', properties: { valid: { type: 'boolean' }, birthDate: { type: 'string' }, age: { type: 'integer' }, governorate: { type: 'string' }, gender: { type: 'string', enum: ['male', 'female'] } } } } } },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // LISTINGS
    // ────────────────────────────────────────────────────────────────────────
    '/api/listings': {
      get: {
        tags: ['Listings'], summary: 'Browse approved listings (public)', security: [],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other'] } },
          { name: 'minPrice', in: 'query', schema: { type: 'number' } },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
          { name: 'governorate', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Listing array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Listing' } } } } },
        },
      },
      post: {
        tags: ['Listings'], summary: 'Create a listing (seller only) — multipart/form-data',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/ListingInput' }],
                properties: { images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 5 } },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Listing' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/listings/my': {
      get: {
        tags: ['Listings'], summary: "Get seller's own listings (all statuses)",
        responses: {
          200: { description: 'Listings array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Listing' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/listings/{id}': {
      get: {
        tags: ['Listings'], summary: 'Get a single listing by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Listing', content: { 'application/json': { schema: { $ref: '#/components/schemas/Listing' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Listings'], summary: 'Update a listing (seller/admin) — multipart/form-data',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/ListingInput' }],
                properties: {
                  status: { type: 'string', enum: ['draft','pending','approved','rejected','sold'] },
                  keepImages: { type: 'string', description: 'JSON array of existing image URLs to keep' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated listing', content: { 'application/json': { schema: { $ref: '#/components/schemas/Listing' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Listings'], summary: 'Delete a listing (seller/admin)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          204: { $ref: '#/components/responses/NoContent' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // ANIMALS
    // ────────────────────────────────────────────────────────────────────────
    '/api/animals': {
      get: {
        tags: ['Animals'], summary: "List seller's animals. Supports optional pagination.",
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
        ],
        responses: {
          200: { description: 'Array of animals (or paginated object when page+limit supplied)', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Animal' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Animals'], summary: 'Add an animal to herd — multipart/form-data',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['type'],
                properties: {
                  type: { type: 'string', enum: ['cattle','buffalo','sheep','goat','camel','horse','poultry','rabbit','other'] },
                  breed: { type: 'string' }, gender: { type: 'string', enum: ['male','female','unknown'] },
                  tagId: { type: 'string' }, dob: { type: 'string', format: 'date' },
                  color: { type: 'string' }, currentWeight: { type: 'number' },
                  healthStatus: { type: 'string', enum: ['healthy','sick','quarantine','deceased'] },
                  notes: { type: 'string' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 4 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Animal' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { description: 'Tag ID already in use' },
        },
      },
    },
    '/api/animals/summary': {
      get: {
        tags: ['Animals'], summary: 'Herd summary stats (totals by type, avg age, avg weight)',
        responses: {
          200: { description: 'Summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/HerdSummary' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/follow-ups-due': {
      get: {
        tags: ['Animals'], summary: 'Unresolved medical follow-ups due within 7 days',
        responses: {
          200: { description: 'Medical records array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MedicalRecord' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/weighing-due': {
      get: {
        tags: ['Animals'], summary: 'Animals with weighing due within 7 days',
        responses: {
          200: { description: 'Animals array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Animal' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/vet/medical': {
      get: {
        tags: ['Animals'], summary: "All medical records across seller's herd",
        responses: {
          200: { description: 'Medical records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MedicalRecord' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/vet/vaccinations': {
      get: {
        tags: ['Animals'], summary: "All vaccination entries across seller's herd (flattened)",
        responses: {
          200: { description: 'Vaccination log entries', content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/{id}': {
      get: {
        tags: ['Animals'], summary: 'Get a single animal',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Animal', content: { 'application/json': { schema: { $ref: '#/components/schemas/Animal' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Animals'], summary: 'Update an animal — multipart/form-data',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string' }, breed: { type: 'string' }, gender: { type: 'string' },
                  healthStatus: { type: 'string' }, status: { type: 'string', enum: ['active','sold','deceased'] },
                  currentWeight: { type: 'number' }, targetWeight: { type: 'number' },
                  pregnancyStatus: { type: 'string', enum: ['none','pregnant','recently_gave_birth'] },
                  keepImages: { type: 'string' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated animal', content: { 'application/json': { schema: { $ref: '#/components/schemas/Animal' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Animals'], summary: 'Delete an animal',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          204: { $ref: '#/components/responses/NoContent' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/animals/{id}/weight': {
      post: {
        tags: ['Animals'], summary: 'Add a weight entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['weightKg'], properties: { weightKg: { type: 'number', minimum: 0.1 }, date: { type: 'string', format: 'date-time' }, notes: { type: 'string' } } } } },
        },
        responses: {
          201: { description: 'Weight entry created' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/{id}/weight/{entryId}': {
      delete: {
        tags: ['Animals'], summary: 'Delete a weight entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'entryId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: {
          204: { $ref: '#/components/responses/NoContent' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/animals/{id}/vaccination': {
      post: {
        tags: ['Animals'], summary: 'Add a vaccination entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['vaccine'], properties: { vaccine: { type: 'string' }, date: { type: 'string', format: 'date-time' }, nextDueDate: { type: 'string', format: 'date-time' }, vet: { type: 'string' }, notes: { type: 'string' } } } } },
        },
        responses: {
          201: { description: 'Vaccination entry created' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/{id}/vaccination/{entryId}': {
      delete: {
        tags: ['Animals'], summary: 'Delete a vaccination entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'entryId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: {
          204: { $ref: '#/components/responses/NoContent' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/animals/{id}/medical': {
      post: {
        tags: ['Animals'], summary: 'Add a medical record (auto-creates doctor expense when cost > 0)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { date: { type: 'string', format: 'date-time' }, diagnosis: { type: 'string' }, treatment: { type: 'string' }, medication: { type: 'string' }, vet: { type: 'string' }, cost: { type: 'number' }, followUpDate: { type: 'string', format: 'date-time' }, notes: { type: 'string' }, resolved: { type: 'boolean' } } } } },
        },
        responses: {
          201: { description: 'Medical record created', content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecord' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Animals'], summary: "Get all medical records for an animal",
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Medical records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MedicalRecord' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/animals/{id}/medical/{recordId}': {
      patch: {
        tags: ['Animals'], summary: 'Update a medical record',
        parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'recordId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/MedicalRecord' } } } },
        responses: { 200: { description: 'Updated record' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Animals'], summary: 'Delete a medical record',
        parameters: [{ $ref: '#/components/parameters/IdParam' }, { name: 'recordId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // ORDERS
    // ────────────────────────────────────────────────────────────────────────
    '/api/orders': {
      post: {
        tags: ['Orders'], summary: 'Place an order (buyer only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['paymentType'],
                properties: {
                  listingId: { $ref: '#/components/schemas/MongoId' },
                  supplyId:  { $ref: '#/components/schemas/MongoId' },
                  quantity:  { type: 'integer', minimum: 1 },
                  paymentType: { type: 'string', enum: ['deposit','cod','instapay'] },
                  depositAmount: { type: 'number' },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      get: {
        tags: ['Orders'], summary: 'List orders (scoped to role: buyer sees own, seller sees theirs, admin sees all)',
        responses: {
          200: { description: 'Orders array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/orders/{id}': {
      get: {
        tags: ['Orders'], summary: 'Get a single order',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/orders/{id}/status': {
      put: {
        tags: ['Orders'], summary: 'Update order status (seller/admin)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['pending','confirmed','completed','cancelled'] } } } } },
        },
        responses: {
          200: { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/orders/{id}/delivery': {
      patch: {
        tags: ['Orders'], summary: 'Set delivery cost and status (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { deliveryCost: { type: 'number' }, deliveryStatus: { type: 'string', enum: ['pending','in_transit','delivered'] } } } } },
        },
        responses: {
          200: { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // FINANCE
    // ────────────────────────────────────────────────────────────────────────
    '/api/finance/expenses': {
      post: {
        tags: ['Finance'], summary: 'Record an expense (seller only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['category', 'amount'], properties: { category: { type: 'string', enum: ['feed','doctor','transport','electricity','salary','rent','water','maintenance','other'] }, amount: { type: 'number', minimum: 0.01 }, date: { type: 'string', format: 'date' }, note: { type: 'string' } } } } },
        },
        responses: {
          201: { description: 'Expense created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Finance'], summary: 'List expenses (seller/admin)',
        parameters: [
          { $ref: '#/components/parameters/FromQuery' },
          { $ref: '#/components/parameters/ToQuery' },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'sellerId', in: 'query', schema: { $ref: '#/components/schemas/MongoId' }, description: 'Admin only' },
        ],
        responses: {
          200: { description: 'Expenses array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Expense' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/finance/expenses/{id}': {
      put: {
        tags: ['Finance'], summary: 'Update an expense',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } },
        responses: { 200: { description: 'Updated expense' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Finance'], summary: 'Delete an expense',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/finance/income': {
      post: {
        tags: ['Finance'], summary: 'Record income (seller only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['type', 'amount'], properties: { type: { type: 'string', enum: ['sale','deposit'] }, amount: { type: 'number', minimum: 0.01 }, date: { type: 'string', format: 'date' }, listing: { $ref: '#/components/schemas/MongoId' }, order: { $ref: '#/components/schemas/MongoId' }, note: { type: 'string' } } } } },
        },
        responses: {
          201: { description: 'Income created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Income' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      get: {
        tags: ['Finance'], summary: 'List income entries (seller/admin)',
        parameters: [
          { $ref: '#/components/parameters/FromQuery' },
          { $ref: '#/components/parameters/ToQuery' },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sale','deposit'] } },
          { name: 'sellerId', in: 'query', schema: { $ref: '#/components/schemas/MongoId' }, description: 'Admin only' },
        ],
        responses: {
          200: { description: 'Income array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Income' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/finance/income/{id}': {
      put: {
        tags: ['Finance'], summary: 'Update an income entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Income' } } } },
        responses: { 200: { description: 'Updated income' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Finance'], summary: 'Delete an income entry',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/api/finance/summary': {
      get: {
        tags: ['Finance'], summary: 'Financial summary (total income, expenses, profit)',
        parameters: [
          { $ref: '#/components/parameters/FromQuery' },
          { $ref: '#/components/parameters/ToQuery' },
          { name: 'sellerId', in: 'query', schema: { $ref: '#/components/schemas/MongoId' }, description: 'Admin only' },
        ],
        responses: {
          200: { description: 'Summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/FinanceSummary' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/finance/analytics': {
      get: {
        tags: ['Finance'], summary: 'Monthly analytics: income vs expenses trend, breakdowns by category and order status',
        parameters: [
          { name: 'months', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 6 } },
          { name: 'sellerId', in: 'query', schema: { $ref: '#/components/schemas/MongoId' }, description: 'Admin only' },
        ],
        responses: {
          200: { description: 'Analytics data', content: { 'application/json': { schema: { type: 'object', properties: { monthly: { type: 'array', items: { type: 'object' } }, incomeByType: { type: 'object' }, expenseByCategory: { type: 'object' }, orderStats: { type: 'object' }, topAnimalTypes: { type: 'array', items: { type: 'object' } } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // DAIRY
    // ────────────────────────────────────────────────────────────────────────
    '/api/dairy': {
      get: {
        tags: ['Dairy'], summary: 'Browse approved dairy products (public)', security: [],
        responses: {
          200: { description: 'Dairy products array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DairyProduct' } } } } },
        },
      },
      post: {
        tags: ['Dairy'], summary: 'Create a dairy product listing (seller only) — multipart/form-data',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['name','type','quantity','unit','pricePerUnit'],
                properties: {
                  name: { type: 'string' }, type: { type: 'string', enum: ['milk','cheese','yogurt','butter','cream','ghee','other'] },
                  quantity: { type: 'number' }, unit: { type: 'string', enum: ['kg','liter','piece','pack','dozen'] },
                  pricePerUnit: { type: 'number' }, description: { type: 'string' },
                  minStockAlert: { type: 'number' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 5 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/DairyProduct' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/dairy/my': {
      get: {
        tags: ['Dairy'], summary: "Get seller's own dairy products",
        responses: {
          200: { description: 'Dairy products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DairyProduct' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/dairy/admin/all': {
      get: {
        tags: ['Dairy'], summary: 'All dairy products regardless of status (admin only)',
        responses: {
          200: { description: 'All dairy products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DairyProduct' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/dairy/{id}': {
      get: {
        tags: ['Dairy'], summary: 'Get a dairy product by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Dairy product', content: { 'application/json': { schema: { $ref: '#/components/schemas/DairyProduct' } } } }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Dairy'], summary: 'Update a dairy product (seller/admin) — multipart/form-data',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { name: { type: 'string' }, quantity: { type: 'number' }, pricePerUnit: { type: 'number' }, images: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } },
        responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/DairyProduct' } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
      delete: {
        tags: ['Dairy'], summary: 'Delete a dairy product (seller/admin)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/dairy/{id}/approve': {
      post: {
        tags: ['Dairy'], summary: 'Approve or reject a dairy product (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { approved: { type: 'boolean' }, reason: { type: 'string' } } } } } },
        responses: { 200: { description: 'Status updated' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/api/dairy/{id}/stock': {
      post: {
        tags: ['Dairy'], summary: 'Adjust stock quantity (seller only). Triggers low-stock notification when below minStockAlert.',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['change'], properties: { change: { type: 'number', description: 'Positive to add, negative to remove' }, note: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Updated product', content: { 'application/json': { schema: { $ref: '#/components/schemas/DairyProduct' } } } }, 400: { $ref: '#/components/responses/BadRequest' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // SUPPLIES
    // ────────────────────────────────────────────────────────────────────────
    '/api/supplies': {
      get: {
        tags: ['Supplies'], summary: 'Browse supplies (public: approved only; seller: own; admin: all)',
        security: [],
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string', enum: ['feed','veterinary','equipment','seeds','other'] } }],
        responses: {
          200: { description: 'Supplies array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Supply' } } } } },
        },
      },
      post: {
        tags: ['Supplies'], summary: 'Create a supply listing (seller only) — multipart/form-data',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object', required: ['name','category','quantity','unit','pricePerUnit'],
                properties: {
                  name: { type: 'string' }, category: { type: 'string', enum: ['feed','veterinary','equipment','seeds','other'] },
                  description: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' },
                  pricePerUnit: { type: 'number' }, minOrderQty: { type: 'integer' },
                  deliveryAvailable: { type: 'boolean' }, deliveryCost: { type: 'number' },
                  images: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 5 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Supply' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/supplies/{id}': {
      get: {
        tags: ['Supplies'], summary: 'Get a supply by ID',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Supply', content: { 'application/json': { schema: { $ref: '#/components/schemas/Supply' } } } }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      put: {
        tags: ['Supplies'], summary: 'Update a supply (seller/admin) — multipart/form-data',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { content: { 'multipart/form-data': { schema: { type: 'object', properties: { name: { type: 'string' }, category: { type: 'string' }, quantity: { type: 'number' }, pricePerUnit: { type: 'number' } } } } } },
        responses: { 200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Supply' } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
      delete: {
        tags: ['Supplies'], summary: 'Delete a supply (seller/admin)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/supplies/{id}/status': {
      patch: {
        tags: ['Supplies'], summary: 'Approve / reject / mark sold-out (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['approved','rejected','sold_out'] }, rejectionReason: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Updated supply', content: { 'application/json': { schema: { $ref: '#/components/schemas/Supply' } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // REVIEWS
    // ────────────────────────────────────────────────────────────────────────
    '/api/reviews': {
      post: {
        tags: ['Reviews'], summary: 'Submit a review for a completed order (buyer only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['orderId','rating'], properties: { orderId: { $ref: '#/components/schemas/MongoId' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string', maxLength: 500 } } } } },
        },
        responses: {
          201: { description: 'Review created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Review' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/reviews/my-reviewed': {
      get: {
        tags: ['Reviews'], summary: 'Orders the buyer has already reviewed',
        responses: {
          200: { description: 'Order IDs array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/MongoId' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/reviews/admin/all': {
      get: {
        tags: ['Reviews'], summary: 'All reviews (admin only)',
        responses: {
          200: { description: 'Reviews array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Review' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/reviews/seller/{sellerId}': {
      get: {
        tags: ['Reviews'], summary: 'Get reviews for a seller (public)',
        security: [],
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: {
          200: { description: 'Reviews array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Review' } } } } },
        },
      },
    },
    '/api/reviews/{id}/reply': {
      patch: {
        tags: ['Reviews'], summary: "Add seller's reply to a review",
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['body'], properties: { body: { type: 'string', maxLength: 500 } } } } } },
        responses: { 200: { description: 'Review with reply' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/api/reviews/{id}': {
      delete: {
        tags: ['Reviews'], summary: 'Delete a review (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 204: { $ref: '#/components/responses/NoContent' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS
    // ────────────────────────────────────────────────────────────────────────
    '/api/notifications': {
      get: {
        tags: ['Notifications'], summary: 'Get notification inbox',
        responses: {
          200: { description: 'Notifications array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Notification' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/unread-count': {
      get: {
        tags: ['Notifications'], summary: 'Total unread notification count',
        responses: {
          200: { description: 'Count', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'], summary: 'Mark all notifications as read',
        responses: {
          200: { description: 'Marked read' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'], summary: 'Mark a single notification as read',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Marked read' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // MESSAGES
    // ────────────────────────────────────────────────────────────────────────
    '/api/messages': {
      get: {
        tags: ['Messages'], summary: 'List all conversations (inbox)',
        responses: {
          200: { description: 'Conversations', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Conversation' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Messages'], summary: 'Start or retrieve a conversation with another user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['recipientId'], properties: { recipientId: { $ref: '#/components/schemas/MongoId' }, contextType: { type: 'string', enum: ['listing','order','general'] }, contextRefId: { $ref: '#/components/schemas/MongoId' }, contextLabel: { type: 'string', maxLength: 120 } } } } },
        },
        responses: {
          200: { description: 'Conversation (existing or new)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Conversation' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/messages/unread-count': {
      get: {
        tags: ['Messages'], summary: 'Total unread message count across all conversations',
        responses: {
          200: { description: 'Count', content: { 'application/json': { schema: { type: 'object', properties: { count: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/messages/{id}': {
      get: {
        tags: ['Messages'], summary: 'Get all messages in a conversation',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Messages array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Messages'], summary: 'Send a message or price offer',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { body: { type: 'string', maxLength: 1000 }, type: { type: 'string', enum: ['text','offer'], default: 'text' }, offerAmount: { type: 'number', minimum: 1 } } } } },
        },
        responses: {
          201: { description: 'Message sent', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/messages/{id}/read': {
      patch: {
        tags: ['Messages'], summary: 'Mark all messages in a conversation as read',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: { 200: { description: 'Marked read' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },
    '/api/messages/{convId}/offers/{msgId}': {
      patch: {
        tags: ['Messages'], summary: 'Accept, reject, or counter a price offer',
        parameters: [
          { name: 'convId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } },
          { name: 'msgId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['accepted','rejected','countered'] }, counterAmount: { type: 'number', minimum: 1 } } } } },
        },
        responses: { 200: { description: 'Offer updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // FAVORITES
    // ────────────────────────────────────────────────────────────────────────
    '/api/favorites': {
      get: {
        tags: ['Favorites'], summary: 'List saved farms (buyer only)',
        responses: {
          200: { description: 'Seller profiles array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/favorites/{sellerId}': {
      post: {
        tags: ['Favorites'], summary: 'Add a farm to favorites',
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: { 200: { description: 'Added' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
      delete: {
        tags: ['Favorites'], summary: 'Remove a farm from favorites',
        parameters: [{ name: 'sellerId', in: 'path', required: true, schema: { $ref: '#/components/schemas/MongoId' } }],
        responses: { 200: { description: 'Removed' }, 401: { $ref: '#/components/responses/Unauthorized' } },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // BUDGET
    // ────────────────────────────────────────────────────────────────────────
    '/api/budget': {
      get: {
        tags: ['Budget'], summary: 'Get budget targets for a year (seller only)',
        parameters: [{ name: 'year', in: 'query', schema: { type: 'integer', example: 2025 } }],
        responses: {
          200: { description: 'Budget entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Budget' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      put: {
        tags: ['Budget'], summary: 'Upsert a monthly budget target for a category (seller only)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['year','month','category','targetAmount'], properties: { year: { type: 'integer' }, month: { type: 'integer', minimum: 1, maximum: 12 }, category: { type: 'string' }, targetAmount: { type: 'number' } } } } },
        },
        responses: {
          200: { description: 'Budget entry', content: { 'application/json': { schema: { $ref: '#/components/schemas/Budget' } } } },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // ADMIN
    // ────────────────────────────────────────────────────────────────────────
    '/api/admin/stats': {
      get: {
        tags: ['Admin'], summary: 'Platform KPI stats (admin only)',
        responses: {
          200: { description: 'Stats object', content: { 'application/json': { schema: { type: 'object', properties: { totalUsers: { type: 'integer' }, totalSellers: { type: 'integer' }, totalBuyers: { type: 'integer' }, totalListings: { type: 'integer' }, pendingListings: { type: 'integer' }, totalOrders: { type: 'integer' }, completedOrders: { type: 'integer' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/platform-analytics': {
      get: {
        tags: ['Admin'], summary: 'Platform-wide registration and order trend data (admin only)',
        responses: {
          200: { description: 'Analytics data', content: { 'application/json': { schema: { type: 'object' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/analytics': {
      get: {
        tags: ['Admin'], summary: 'Revenue by governorate from completed orders (admin only)',
        responses: {
          200: {
            description: 'Revenue by governorate',
            content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { governorate: { type: 'string' }, revenue: { type: 'number' }, orderCount: { type: 'integer' } } } } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin'], summary: 'List all users with optional role filter and search (admin only)',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['buyer','seller','admin'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Users array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users/{id}/toggle': {
      patch: {
        tags: ['Admin'], summary: 'Toggle user active status (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Updated user', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPublic' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/admin/users/{id}': {
      delete: {
        tags: ['Admin'], summary: 'Delete a user (admin only)',
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          204: { $ref: '#/components/responses/NoContent' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // ────────────────────────────────────────────────────────────────────────
    // MISC
    // ────────────────────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Misc'], summary: 'Health check', security: [],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
      },
    },
    '/api/health': {
      get: {
        tags: ['Misc'], summary: 'Health check (API prefix)', security: [],
        responses: { 200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' } } } } } } },
      },
    },
    '/api/market-prices': {
      get: {
        tags: ['Misc'], summary: 'Current market reference prices for livestock types', security: [],
        responses: {
          200: { description: 'Price list', content: { 'application/json': { schema: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, pricePerKg: { type: 'number' }, unit: { type: 'string' } } } } } } },
        },
      },
    },
    '/api/eid': {
      get: {
        tags: ['Misc'], summary: 'Get EID (Eid al-Adha) season config (public)',
        security: [],
        responses: { 200: { description: 'EID config', content: { 'application/json': { schema: { type: 'object', properties: { eidMode: { type: 'boolean' }, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' } } } } } } },
      },
      patch: {
        tags: ['Misc'], summary: 'Update EID config (admin only)',
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { eidMode: { type: 'boolean' }, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' } } } } } },
        responses: { 200: { description: 'Updated config' }, 401: { $ref: '#/components/responses/Unauthorized' }, 403: { $ref: '#/components/responses/Forbidden' } },
      },
    },
    '/api/sellers': {
      get: {
        tags: ['Misc'], summary: 'Browse and search seller profiles (public)', security: [],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'governorate', in: 'query', schema: { type: 'string' } },
          { name: 'animalType', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Sellers array', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserPublic' } } } } },
        },
      },
    },
    '/api/farms/{id}': {
      get: {
        tags: ['Misc'], summary: 'Get full farm/seller profile by ID (public)', security: [],
        parameters: [{ $ref: '#/components/parameters/IdParam' }],
        responses: {
          200: { description: 'Farm profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserPublic' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/statements': {
      get: {
        tags: ['Finance'], summary: 'Combined financial statement (expenses + income) for a date range',
        parameters: [
          { $ref: '#/components/parameters/FromQuery' },
          { $ref: '#/components/parameters/ToQuery' },
        ],
        responses: {
          200: { description: 'Statement data', content: { 'application/json': { schema: { type: 'object', properties: { expenses: { type: 'array', items: { $ref: '#/components/schemas/Expense' } }, income: { type: 'array', items: { $ref: '#/components/schemas/Income' } }, summary: { $ref: '#/components/schemas/FinanceSummary' } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};

module.exports = swaggerSpec;
