# CRM Frontend

Enterprise-grade Customer Relationship Management System built with Next.js 14+, React Query, Zustand, Tailwind CSS, and Framer Motion.

## 🚀 Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Server State**: [TanStack React Query](https://tanstack.com/query/)
- **Client State**: [Zustand](https://github.com/pmndrs/zustand)
- **Linting**: ESLint + Prettier
- **PWA**: PWA-ready for future mobile apps

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── providers.tsx      # React Query provider
│   └── (auth)/            # Auth routes
├── features/              # Feature-based modules
│   ├── auth/             # Authentication feature
│   ├── dashboard/        # Dashboard feature
│   └── ...
├── components/            # Reusable components
├── lib/                   # Utilities and helpers
├── stores/                # Zustand stores
├── styles/                # Global styles
└── types/                 # TypeScript types
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
npm run type-check
npm run format
```

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types
- `npm run format` - Format code with Prettier

## 🏗️ Architecture

### Feature-Based Structure
The project uses a feature-based folder structure, where each feature (auth, dashboard, etc.) is self-contained with its own components, hooks, and types.

### State Management

**Server State (React Query)**
- Handles data fetching and caching
- Automatic background updates
- Error handling and retries

**Client State (Zustand)**
- UI state (sidebar, modals, etc.)
- User preferences
- Authentication state

## 🎨 Styling

- Global styles in `src/styles/globals.css`
- Tailwind CSS configuration in `tailwind.config.ts`
- Custom colors and animations defined in theme

## 🔐 PWA Support

The project is configured for PWA support with:
- `manifest.json` for app metadata
- Icons at various sizes
- Service worker ready (can be added)

## 📝 Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🤝 Contributing

1. Create a feature branch
2. Follow the project structure
3. Write clean, typed code
4. Run linting and type checks before committing

## 📄 License

MIT
# Furniture-CRM
