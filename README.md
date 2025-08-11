# Gharfar Backend (Airbnb Clone)

This is a scalable Node.js backend for the Gharfar project, inspired by Airbnb. It uses Express and Mongoose, and follows best practices for structure and maintainability.

## Project Structure

- `src/config/` - Configuration files (DB, Redis, env)
- `src/controllers/` - Route logic
- `src/routes/` - Route definitions
- `src/models/` - Mongoose schemas
- `src/middlewares/` - Auth, error handling, etc.
- `src/services/` - Business logic
- `src/utils/` - Helpers (token, hashing, etc.)
- `src/jobs/` - Queues, cronjobs
- `src/validators/` - Request payload validation
- `src/constants/` - Enums, roles, messages
- `src/app.js` - Express app setup
- `src/server.js` - App entry point

## Getting Started

1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file (see `.env.example`).
3. Start the server:
   ```sh
   npm start
   ```

## License
MIT
# gharfar_BE
