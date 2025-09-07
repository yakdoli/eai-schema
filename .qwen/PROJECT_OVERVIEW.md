# EAI Work Tool Enterprise Protocol Extension
## Project Overview

### Project Description
The EAI Work Tool is a React-based application for generating XML schemas and data structures for Enterprise Application Integration. This project extends the tool to support multiple enterprise messaging protocols including WSDL, SOAP, XSD, JSON-RPC, and SAP RFC/IDoc.

### Current Capabilities
- Modern UI built with React 19, Vite, and Tailwind CSS 4
- Interactive data structure grid for defining fields and types
- Generate, download, and copy functionality for results
- Responsive design with dark/light theme support
- Comprehensive UI components using Radix UI and shadcn/ui

### Extension Goals
- Add support for WSDL (Web Services Description Language) generation
- Implement SOAP (Simple Object Access Protocol) message creation
- Enable XSD (XML Schema Definition) generation and validation
- Support JSON-RPC (Remote Procedure Call) protocol
- Integrate SAP RFC/IDoc enterprise messaging protocols
- Maintain existing functionality while adding new protocols

### Technology Stack
- **Frontend**: React 19 with JSX
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4 with CSS variables
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Package Manager**: pnpm

### Project Structure
```
src/
├── protocols/        # Protocol implementations
├── models/           # Data models for each protocol
├── factories/        # Protocol factory pattern
├── utils/            # Utility classes
├── components/       # UI components
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── assets/           # Static assets
├── App.jsx           # Main application component
├── main.jsx          # Application entry point
└── App.css           # Global styles and Tailwind configuration
```

### Documentation Organization
All project documentation is maintained in the `.qwen` directory to keep the main project directory clean while providing comprehensive information for developers.