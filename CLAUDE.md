# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 customer support AI application called "SupportAI" that helps agents review and respond to customer messages. The app uses React 19, TypeScript, Tailwind CSS, and integrates with OpenAI's GPT-4o model for AI-powered response generation.

## Development Commands

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues

## Architecture

### Core Application Structure

The app follows a single-page application pattern with view-based routing handled by React state. The main entry point is `app/page.tsx` which renders the `MainApp` component.

**Main Components:**
- `MainApp` - Root component that manages navigation and view switching between 4 main views
- `CustomerSupportDashboard` - Message review interface with swipeable cards (Tinder-style)
- `AgentDashboard` - Analytics dashboard showing metrics and performance data
- `DetailedReviewInterface` - Detailed message review with full conversation context
- `SettingsPage` - Application configuration and preferences

### State Management

The application uses React Context for global state:
- `MessageManagerProvider` - Manages message data and review status
- `SettingsProvider` - Handles application settings and configuration

### API Integration

**AI Response Generation** (`app/api/generate-response/route.ts`):
- Uses OpenAI GPT-4o model via the `ai` SDK
- Generates responses, categorizes messages, and assigns priority levels
- Categories: Account Access, Billing, Technical, Feature Request, Bug Report, General Inquiry
- Priority levels: low, medium, high based on urgency and impact

**Message Management** (`app/api/messages/route.ts`):
- Handles CRUD operations for customer messages
- Integrates with the message review workflow

### UI Framework

- **Components:** Uses Radix UI primitives with custom styling
- **Styling:** Tailwind CSS with custom theme configuration
- **Icons:** Lucide React icon library
- **Charts:** Recharts for dashboard visualizations

### Key Features

1. **Message Review Workflow:** Swipeable card interface for quick message triage
2. **AI-Powered Responses:** Automatic response generation with category and priority classification
3. **Analytics Dashboard:** Performance metrics and review statistics
4. **Mobile-Responsive:** Optimized navigation for desktop and mobile devices
5. **Settings Management:** Configurable application behavior and preferences

### Import Patterns

- Use `@/` alias for imports from the project root
- UI components are imported from `@/components/ui/`
- Utilities and contexts are in `@/lib/`
- API routes follow Next.js App Router conventions

### TypeScript Configuration

- Strict mode enabled
- Path aliases configured with `@/*` pointing to project root
- Next.js plugin integrated for optimal type checking