# GEMINI.md

## Project Overview

This project is a modern, React-based web application called the "EAI Work Tool." Its primary purpose is to provide a user-friendly interface for generating XML schemas and other data structures used in Enterprise Application Integration (EAI). The tool is built with a modern frontend stack that includes React 19, Vite, and Tailwind CSS 4. It features a modular and extensible architecture designed to support various enterprise messaging protocols like WSDL, SOAP, XSD, and more.

The application's core is a protocol abstraction layer that uses a factory pattern to instantiate protocol-specific objects. This allows for consistent implementation and easy extension with new protocols. The UI is built with Radix UI primitives and shadcn/ui styling, providing a comprehensive component library for a modern and responsive user experience.

## Building and Running

The project uses `pnpm` as its package manager. The following commands are essential for building and running the application:

*   **Install Dependencies:**
    ```bash
    pnpm install
    ```

*   **Start Development Server:**
    ```bash
    pnpm dev
    ```
    This will start the Vite development server, and the application will be accessible at `http://localhost:5173`.

*   **Build for Production:**
    ```bash
    pnpm build
    ```
    This command bundles the application for production, and the output is placed in the `dist` directory.

*   **Linting and Formatting:**
    ```bash
    pnpm lint
    pnpm format
    ```
    These commands run ESLint and Prettier to enforce code quality and consistent formatting.

*   **Type Checking:**
    ```bash
    pnpm typecheck
    ```
    This command runs the TypeScript compiler to check for type errors.

## Development Conventions

The project follows a set of well-defined development conventions, as outlined in the `.qwen/WORKFLOW_GUIDELINES.md` document. Key conventions include:

*   **Modular Architecture:** The codebase is organized into modules for protocols, models, factories, and utilities, promoting separation of concerns and reusability.
*   **Object-Oriented Design:** The use of base classes and a factory pattern for protocol implementation demonstrates a commitment to object-oriented principles.
*   **State Management:** The application uses React's `useState` hook for managing component-level state.
*   **Testing:** The project has a dedicated `__tests__` directory and uses a testing framework (likely Jest, as mentioned in the guidelines) for unit and integration testing.
*   **Documentation:** All project documentation is maintained in the `.qwen` directory, with specific files for design, workflow, and other project-related information.
*   **Code Style:** The project uses ESLint and Prettier to enforce a consistent code style. The ESLint configuration is defined in `eslint.config.js`.
*   **Commit Guidelines:** The project follows conventional commit guidelines, with clear and descriptive commit messages.
