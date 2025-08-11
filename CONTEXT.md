# Gharfar Backend Project Context (as of 2025-07-04)

## Overview
This file documents the backend progress, architecture, and key logic for the Gharfar Airbnb clone project. It is intended for developers to quickly understand the current state, design decisions, and how to extend or debug the system. Update this file as new features or changes are made.

---

## Project Structure & Stack
- **Node.js** backend using **Express** and **Mongoose** (MongoDB Atlas).
- Modular, scalable folder structure: `controllers/`, `services/`, `models/`, `routes/`, `middlewares/`, `validators/`, `utils/`, `constants/`, `jobs/`, `interfaces/`, `tests/`.
- Environment variables managed in `.env` (MongoDB URI, JWT secret, Redis, etc.).

---

## Core Modules & Logic

### User Module
- **Model:**
  - Roles: `guest`, `host`, `landlord`, `admin`, `superadmin`, `support`, `operator`.
  - References: listings, bookings, managedHosts, contents.
  - Passwords hashed with bcrypt.
  - Flags: `isActive`, `isVerified`.
- **Auth:**
  - JWT-based authentication (`auth` middleware).
  - Role-based authorization (`authorizeRoles`).
- **Routes:**
  - `/api/users/register` (public)
  - `/api/users/login` (public)
  - `/api/users/me` (auth required)
- **Logic:**
  - Only non-guests can create property listings.
  - User registration, login, and profile retrieval implemented.
  - Admins can create, update, delete users, assign roles, and manage all user permissions via secure API endpoints.
  - User permissions are managed as boolean fields (`canLogin`, `canBook`, `canList`, `manageHosts`, `accessUser`, `manageContent`, `deleteListing`, `assignRoles`).
  - All user management features are accessible via REST APIs.
  - The backend is structured for scalability and maintainability, following Express and Mongoose best practices.

### Property Module
- **Model:**
  - Airbnb-like fields: title, description, address, city, state, country, zipcode, location (GeoJSON), price, guests, bedrooms, beds, bathrooms, propertyType, roomType, houseRules, highlights, isActive, createdAt.
  - **images**: Array of ObjectIds referencing `Image` collection.
  - **amenities**: Array of ObjectIds referencing `Amenity` collection.
  - **availability**: Array of `{ start, end, isAvailable }` for calendar logic.
  - **reviews**: Array of ObjectIds referencing `Review` collection.
- **Logic:**
  - Only users with role `host`, `landlord`, `admin`, or `content` can create listings (enforced in service and route).
  - Geospatial index for location-based queries.
- **Routes:**
  - `/api/properties` (GET: all, POST: create [auth+role], uses variables in Postman)
  - `/api/properties/:id` (GET: by ID)

### Booking Module
- **Model:**
  - References property, user, checkIn, checkOut, guests, totalPrice, status, createdAt.
- **Logic:**
  - Only authenticated users can create/view bookings.
- **Routes:**
  - `/api/bookings` (POST: create [auth])
  - `/api/bookings/my` (GET: user's bookings [auth])

### Images & Amenities
- **Image model:** url, property ref, description, uploadedAt.
- **Amenity model:** name, icon, description.
- Both referenced in Property model.

---

## Security
- All sensitive/protected routes use JWT authentication and, where needed, role-based authorization.
- JWT secret is securely generated and stored in `.env`.
- Passwords are hashed before storage.

---

## Postman Collections
- All modules have Postman collections with variables for `base_url` and `auth_token` for easy environment switching and authentication.
- Example usage:
  - Set `base_url` and `auth_token` in Postman environment.
  - Register/login users, create properties/bookings, etc.

---

## Development & Next Steps
- Add request validation (Joi/Zod) for all endpoints.
- Implement CRUD for images, amenities, and reviews.
- Add admin/content moderation endpoints.
- Add more tests and error handling.
- Extend calendar/availability logic for advanced booking scenarios.

---

## How to Use This Context
- Use this file to quickly recall the current backend logic, models, and API structure.
- Reference this for onboarding, debugging, or planning new features.
- Update this file as you add new modules, endpoints, or make architectural changes.
