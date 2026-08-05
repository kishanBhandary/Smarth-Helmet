# Aegis Smart Helmet System

A comprehensive, production-ready full-stack telemetry and safety dashboard for next-generation Smart Helmets. Built with **Next.js 15+ (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, **Supabase (PostgreSQL)**, and **Auth.js v5 (NextAuth)**.

---

## Key Features

1. **Rider Command Dashboard**:
   - Live speed indicators with circular progress rings.
   - Interactive 180&deg; rear radar collision visualizer showing proximity warnings.
   - Dynamic GPS route mapping using **React Leaflet** showing active ride polylines.
   - Live system diagnostic checklist tracking sensor nodes (Accelerometer, Radar, GPS, IMU, Vitals).

2. **Autonomous Crash SOS System**:
   - Intelligent fall detection triggers.
   - Flashing fullscreen warning overlay with a customizable countdown timer (default 30s).
   - Real-time synthesized siren sounds generated directly in-browser using the **Web Audio API**.
   - Automatic dispatch of SMS warnings and GPS coordinates to primary emergency contact lists when the timer expires.

3. **Telemetry & Simulation Console**:
   - Interactive controls to start/stop rides, drain the helmet battery, fail sensors, trigger radar warnings, and simulate falls to observe live UI responsiveness.
   - Auto-syncing of coordinates and warnings to PostgreSQL.

4. **Analytics & Ride History**:
   - Glowing **Recharts** charts showing monthly distance traveled and weekly logs.
   - Searchable, tabular logs of completed rides showing dates, distances, durations, and speeds.

5. **Settings & Light Tuning**:
   - Custom LED safety light patterns (SOLID, FLASHING, PULSE, OFF) with a live glowing CSS preview.
   - HUD volume sliders and toggleable safety features.

6. **Secured Auth & RBAC**:
   - JWT-based Auth.js v5 authentication with credentials, Google, and GitHub providers.
   - Custom middleware protecting dashboard folders and redirecting visitors.

---

## Directory Structure

```text
├── app/
│   ├── api/                 # REST Route Handlers (User, Helmet, Rides, Settings, Emergency, Alerts)
│   ├── dashboard/           # Main telemetry dashboard console
│   ├── emergency/           # Emergency contacts configuration forms
│   ├── login/               # Glassmorphic Login card with OAuth options
│   ├── register/            # Sign Up form with validation and auto-login
│   ├── rides/               # Analytical history and Recharts layout
│   ├── settings/            # System preferences and LED previewer
│   ├── globals.css          # Design tokens, custom animations, and glassmorphism styling
│   ├── layout.tsx           # Session provider inclusion and SEO tags
│   └── page.tsx             # Interactive high-tech landing page
├── components/
│   ├── dashboard-layout.tsx # Page viewport wrap, Auth checks, and initial state fetchers
│   ├── map.tsx              # React Leaflet live position map with route trailing
│   ├── sidebar.tsx          # Connected helmet BLE state indicators and navigation menu
│   └── sos-overlay.tsx      # Flashing emergency countdown overlay with Web Audio synthesizer
├── hooks/
│   └── useStore.ts          # Zustand store for live telemetry and simulators
├── lib/
│   ├── api-response.ts      # Standardized JSON response helpers
│   ├── prisma.ts            # Singleton database client connector
│   └── validations.ts       # Strict Zod request schemas
├── providers/
│   └── session-provider.tsx # NextAuth Client context wrapper
├── services/                # Business logic repository files (User, Ride, Sensor, Settings, SOS)
├── prisma/
│   ├── schema.prisma        # PostgreSQL Schema with relations, enums, and indexes
│   └── migrations/          # Schema migrations history
└── middleware.ts            # NextAuth route protection guard
```

---

## API Endpoints List

### Authentication
* `POST /api/auth/register` - Registers a new user and seeds default settings.

### Profile & Settings
* `GET /api/user` - Fetches active profile.
* `GET /api/settings` - Retrieves fall detection sensitivity, volume, and LED modes.
* `PUT /api/settings` - Updates helmet preferences.

### Helmet Telemetry
* `GET /api/helmets` - Lists registered helmets.
* `POST /api/helmets` - Registers a helmet.
* `POST /api/helmets/[id]/battery` - Logs a battery level update.

### Rides & Radar
* `GET /api/rides` - Lists ride histories.
* `POST /api/rides` - Starts a new ride.
* `PUT /api/rides/[id]` - Completes a ride (commits totals).
* `POST /api/rides/[id]/locations` - appends coordinate markers.
* `POST /api/rides/[id]/detections` - logs rear radar collision alerts.

### Crash Events
* `GET /api/crashes` - Lists crash alarms.
* `PUT /api/crashes/[id]` - Cancels/resolves a crash alarm.

### Emergency Contacts
* `GET /api/emergency` - Lists emergency contacts.
* `POST /api/emergency` - Creates a contact.
* `PUT /api/emergency/[id]` - Updates details (set primary).
* `DELETE /api/emergency/[id]` - Removes a contact.

---

## Installation & Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   # PostgreSQL connection (Supabase or Local Docker)
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smarthhelmet?schema=public"
   DIRECT_URL="postgresql://postgres:postgres@localhost:5432/smarthhelmet?schema=public"

   # NextAuth (Generate secret via `npx auth secret`)
   AUTH_SECRET="your-32-character-secret-key"
   NEXTAUTH_URL="http://localhost:3000"

   # OAuth Providers (Optional)
   GOOGLE_CLIENT_ID="google-client-id"
   GOOGLE_CLIENT_SECRET="google-client-secret"
   GITHUB_ID="github-id"
   GITHUB_SECRET="github-secret"
   ```

3. **Deploy Database Schema**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Run in Development**:
   ```bash
   npm run dev
   ```

5. **Typecheck & Compile Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
# Smarth-Helmet

