# EAI Work Tool

A modern React implementation of the EAI Work Tool - Enterprise Application Integration utility for generating XML schemas and data structures.

## Features

- **Modern UI**: Built with React 19, Vite, and Tailwind CSS 4
- **Component Library**: Comprehensive UI components using Radix UI and shadcn/ui
- **Data Management**: Interactive data structure grid for defining fields and types
- **Export Functionality**: Generate, download, and copy results
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Dark/Light Theme**: Built-in theme support

## Technology Stack

- **Frontend**: React 19 with JSX
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 with CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Package Manager**: pnpm
- **Type Safety**: JSDoc annotations
- **Code Quality**: ESLint configuration

## Enterprise Protocol Extension (Planned)

The EAI Work Tool is being extended to support multiple enterprise messaging protocols:

- **WSDL**: Web Services Description Language generation and validation
- **SOAP**: Simple Object Access Protocol message creation
- **XSD**: XML Schema Definition generation and validation
- **JSON-RPC**: Remote procedure call protocol using JSON
- **SAP RFC/IDoc**: SAP enterprise integration protocols

### Extension Architecture

```
src/
├── protocols/        # Protocol implementations
├── models/           # Data models for each protocol
├── factories/        # Protocol factory pattern
├── utils/            # Utility classes
├── components/ui/    # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── assets/           # Static assets
├── App.jsx           # Main application component
├── main.jsx          # Application entry point
└── App.css           # Global styles and Tailwind configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yakdoli/eai-schema.git
   cd eai-schema
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open your browser to `http://localhost:5173`

### Building for Production

```bash
pnpm build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
pnpm preview
```

## Usage

1. **Configure Source**: Fill in the required fields (Root Name is mandatory)
2. **Select Message Type**: Choose from Message Type, Data Type, Statement, Test Data, or Message Mapping
3. **Define Data Structure**: Use the interactive grid to define your data fields
4. **Generate Result**: Click Generate to create your EAI configuration
5. **Export**: Download or copy the generated result

## Project Structure

```
src/
├── protocols/        # Protocol implementations (new)
├── models/           # Data models (new)
├── factories/        # Protocol factory (new)
├── utils/            # Utility classes (new)
├── components/ui/    # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── assets/           # Static assets
├── App.jsx           # Main application component
├── main.jsx          # Application entry point
└── App.css           # Global styles and Tailwind configuration
```

## Components

The project includes a comprehensive set of UI components:

- **Form Controls**: Button, Input, Select, Label, Tabs
- **Layout**: Card, Grid, Container components
- **Data Display**: Tables, Lists, Typography
- **Feedback**: Alerts, Toasts, Loading states
- **Navigation**: Menus, Breadcrumbs, Tabs

## Customization

The project uses Tailwind CSS 4 with CSS variables for easy theming. Modify the CSS variables in `src/App.css` to customize the appearance.

## License

Copyright (C) 2024 YoungHyun Cho  
All Rights Reserved.

## Contributing

This project follows the original EAI Work Tool specifications. For questions or contributions, please refer to the user guides:

- User guide (KO): EAI Work Tool User Guide (KO)
- User guide (EN): EAI Work Tool User Guide (EN)

## Research and Planning Documents

For detailed information about the extension plans, please see:

- `enterprise_protocol_research.md` - Research on enterprise messaging protocols
- `extension_architecture_design.md` - Detailed architecture design
- `implementation_plan_updated.md` - Phased implementation plan
- `package_research.md` - NPM package research
- `prototype_evaluation.md` - Evaluation of WSDL prototype
- `research_summary.md` - Comprehensive research summary