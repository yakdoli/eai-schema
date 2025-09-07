# EAI Work Tool - Project Context

## Project Overview

This is a modern React implementation of the EAI Work Tool - an Enterprise Application Integration utility for generating XML schemas and data structures. The application provides a user-friendly interface for defining data structures and generating EAI configurations.

### Key Features
- Modern UI built with React 19, Vite, and Tailwind CSS 4
- Interactive data structure grid for defining fields and types
- Generate, download, and copy functionality for results
- Responsive design with dark/light theme support
- Comprehensive UI components using Radix UI and shadcn/ui

### Technology Stack
- **Frontend**: React 19 with JSX
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 with CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Package Manager**: pnpm
- **Type Safety**: JSDoc annotations
- **Code Quality**: ESLint configuration

## Project Structure

```
src/
├── components/ui/     # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── assets/           # Static assets
├── App.jsx           # Main application component
├── main.jsx          # Application entry point
└── App.css           # Global styles and Tailwind configuration
```

## Development Workflow

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Key Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install project dependencies |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint to check for code issues |

### Development Server
- Start with: `pnpm dev`
- Access at: http://localhost:5173

### Building for Production
- Run: `pnpm build`
- Output directory: `dist/`

## Application Architecture

### Main Components
1. **Source Configuration Panel** - Input fields for EAI configuration
2. **Result Panel** - Displays generated output with download/copy options
3. **Data Structure Grid** - Interactive table for defining data fields

### State Management
- Uses React's useState hook for managing form data and grid state
- Grid data is stored as an array of objects with fields for structure, field, name, type, etc.

### UI Components
The project uses shadcn/ui components built on Radix UI primitives, including:
- Buttons, Inputs, Selects, Labels
- Cards, Tabs
- Various form controls and layout components

## Code Quality & Conventions

### ESLint Configuration
- Follows recommended JavaScript and React hooks rules
- Custom rules for unused variables and React component exports
- Configured to ignore the `dist` directory

### Styling Conventions
- Uses Tailwind CSS with custom CSS variables for theming
- Dark/light mode support through CSS variables
- Component styling follows shadcn/ui conventions

### Path Aliases
- `@/*` maps to `src/*` for cleaner imports

## Usage Workflow

1. **Configure Source**: Fill in required fields (Root Name is mandatory)
2. **Select Message Type**: Choose from Message Type, Data Type, Statement, Test Data, or Message Mapping
3. **Define Data Structure**: Use the interactive grid to define data fields
4. **Generate Result**: Click Generate to create EAI configuration
5. **Export**: Download or copy the generated result

## Contributing Guidelines

This project follows the original EAI Work Tool specifications. For questions or contributions, please refer to the user guides.

## License

Copyright (C) 2024 YoungHyun Cho
All Rights Reserved.