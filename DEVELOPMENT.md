# SupportAI Development Guide

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
cs-appv1/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   ├── generate-response/ # OpenAI GPT-4o integration
│   │   └── messages/      # Message CRUD operations
│   ├── globals.css        # Global styles and Tailwind
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Main entry point
├── components/            # React components
│   ├── ui/               # Reusable UI components (Radix UI)
│   ├── main-app.tsx      # Root component with routing
│   ├── customer-support-dashboard.tsx # Swipeable message cards
│   ├── agent-dashboard.tsx # Analytics and metrics
│   ├── detailed-review-interface.tsx # Full conversation view
│   ├── settings-page.tsx  # App configuration
│   └── swipeable-card.tsx # Tinder-style card component
└── lib/                   # Utilities and contexts
    ├── message-manager.tsx # Global message state
    ├── settings-context.tsx # App settings state
    └── utils.ts           # Utility functions
```

## Key Features & Components

### Message Review Workflow
- **Swipeable Cards**: Tinder-style interface for quick message triage
- **AI Integration**: GPT-4o generates responses and categorizes messages
- **Categories**: Account Access, Billing, Technical, Feature Request, Bug Report, General
- **Priority Levels**: Low, Medium, High based on urgency and impact

### State Management
- **MessageManagerProvider**: Manages all message data and review status
- **SettingsProvider**: Handles configuration and user preferences
- Uses React Context - no external state management library

### UI Framework
- **Styling**: Tailwind CSS v4 with custom configuration
- **Components**: Radix UI primitives with custom theming
- **Icons**: Lucide React
- **Charts**: Recharts for dashboard visualizations
- **Animations**: Custom CSS animations for swipe gestures

## API Endpoints

### `/api/generate-response`
- **Method**: POST
- **Purpose**: Generate AI responses using OpenAI GPT-4o
- **Input**: Customer message content
- **Output**: Generated response, category, priority level

### `/api/messages`
- **Method**: GET, POST, PUT, DELETE
- **Purpose**: CRUD operations for customer messages
- **Integration**: Works with message review workflow

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack (recommended)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint code quality check
```

## Code Conventions

### Import Patterns
```typescript
// Use @ alias for all internal imports
import { Component } from '@/components/ui/component'
import { useSettings } from '@/lib/settings-context'
import { cn } from '@/lib/utils'
```

### TypeScript
- Strict mode enabled
- All components should be properly typed
- Use interfaces for complex object types
- Prefer type inference where possible

### Component Structure
```typescript
interface ComponentProps {
  // Props interface first
}

export function Component({ prop }: ComponentProps) {
  // Hooks first
  // Event handlers
  // Render logic
  return (
    // JSX with proper TypeScript typing
  )
}
```

## Environment Variables

Create `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Architecture Decisions

### Why No External State Management?
- React Context is sufficient for this app size
- Reduces bundle size and complexity
- Easy to understand and maintain

### Why Radix UI?
- Accessibility built-in
- Unstyled components work well with Tailwind
- Robust and well-maintained

### Why Turbopack?
- Faster development builds
- Better hot module replacement
- Next.js recommended for development

## Common Tasks

### Adding a New Component
1. Create in appropriate directory (`components/` or `components/ui/`)
2. Follow existing naming conventions (kebab-case files, PascalCase components)
3. Use TypeScript interfaces for props
4. Follow existing import patterns

### Adding a New API Route
1. Create in `app/api/[route-name]/route.ts`
2. Use Next.js App Router conventions
3. Handle proper HTTP methods (GET, POST, etc.)
4. Include error handling

### Modifying the AI Integration
1. Edit `/app/api/generate-response/route.ts`
2. Ensure OpenAI API key is configured
3. Test with different message types
4. Update categories/priorities as needed

## Testing Strategy

Currently no testing framework is set up. Consider adding:
- Jest + React Testing Library for unit tests
- Playwright for e2e tests
- Mock OpenAI API calls for reliable testing

## Deployment

### Vercel (Recommended)
1. Connect GitHub repository
2. Add `OPENAI_API_KEY` environment variable
3. Deploy automatically on push to main

### Other Platforms
- Ensure Node.js 18+ support
- Set environment variables
- Run `npm run build` then `npm start`

## Performance Considerations

### Current Optimizations
- Next.js 15 with App Router for efficient routing
- Turbopack for fast development builds
- React 19 for improved performance
- Tailwind CSS for optimized styles

### Potential Improvements
- Add loading states for API calls
- Implement message pagination
- Add caching for AI responses
- Optimize bundle size analysis

## Troubleshooting

### Common Issues

**OpenAI API errors**: Check API key and rate limits
**Build failures**: Run `npm run lint` to check for TypeScript errors
**Styling issues**: Ensure Tailwind classes are properly applied
**State not updating**: Check React Context providers are wrapping components

### Debug Mode
Add to `.env.local`:
```env
NODE_ENV=development
```

## Contributing

1. Follow existing code conventions
2. Run `npm run lint` before committing
3. Test changes thoroughly
4. Keep components focused and reusable
5. Update this documentation when adding major features