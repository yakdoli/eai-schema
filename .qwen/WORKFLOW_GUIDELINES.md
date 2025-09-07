# EAI Work Tool Development Workflow Guidelines

## Overview
This document outlines the development workflow for extending the EAI Work Tool with enterprise messaging protocol support. It includes guidelines for documentation management, testing procedures, and development practices.

## Documentation Management

### Documentation Location
All project documentation is stored in the `.qwen` directory:
```
.qwen/
├── QWEN.md                    # Project context for AI assistants
├── README.md                  # Main project documentation
├── SUMMARY.md                 # Research and planning summary
├── enterprise_protocol_research.md
├── extension_architecture_design.md
├── implementation_plan_updated.md
├── package_research.md
├── prototype_evaluation.md
└── research_summary.md
```

### Documentation Updates
1. All documentation should be updated in the `.qwen` directory
2. Major updates should be reflected in the main `README.md`
3. Use markdown format for consistency
4. Keep documentation synchronized with code changes

## Development Environment

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/yakdoli/eai-schema.git
   cd eai-schema
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start development server:
   ```bash
   pnpm dev
   ```

### Directory Structure
```
src/
├── protocols/        # Protocol implementations
├── models/           # Data models
├── factories/        # Protocol factory
├── utils/            # Utility classes
├── components/       # UI components
├── hooks/            # React hooks
└── lib/              # Utility functions
```

## Testing Workflow

### Sandbox Testing Environment
For testing potentially unstable code, use a separate sandbox environment:

1. Create a sandbox directory:
   ```bash
   mkdir -p /tmp/eai-sandbox
   cd /tmp/eai-sandbox
   ```

2. Copy necessary files for testing:
   ```bash
   cp -r /path/to/eai-schema/src/protocols ./protocols
   cp -r /path/to/eai-schema/src/models ./models
   cp -r /path/to/eai-schema/src/factories ./factories
   cp -r /path/to/eai-schema/src/utils ./utils
   ```

3. Create a simple test harness:
   ```bash
   touch test-harness.js
   ```

4. Run tests in sandbox:
   ```bash
   node test-harness.js
   ```

### Unit Testing
1. Create test files in `src/__tests__/` directory
2. Use Jest for unit testing
3. Test each protocol implementation separately
4. Validate input/output for all functions

### Integration Testing
1. Test protocol generation with sample data
2. Validate generated output against specifications
3. Test cross-protocol compatibility
4. Performance testing with large data sets

## Development Process

### Feature Implementation
1. Create a new branch for each feature:
   ```bash
   git checkout -b feature/protocol-name
   ```

2. Implement the feature following the architecture design
3. Write unit tests for new functionality
4. Update documentation in the `.qwen` directory
5. Run all tests before committing

### Code Review Process
1. Submit a pull request for code review
2. Ensure all tests pass
3. Verify documentation is updated
4. Get approval from team members
5. Merge after approval

### Commit Guidelines
1. Use clear, descriptive commit messages
2. Reference issue numbers when applicable
3. Keep commits focused on single changes
4. Squash related commits before merging

## Protocol Implementation Workflow

### 1. Research Phase
1. Study the protocol specification
2. Identify key components and requirements
3. Research existing npm packages
4. Document findings in `.qwen/` directory

### 2. Design Phase
1. Create protocol class extending BaseProtocol
2. Design data model for the protocol
3. Plan UI components (if needed)
4. Document design decisions

### 3. Implementation Phase
1. Implement protocol class methods
2. Create data model
3. Add validation logic
4. Implement generation functionality

### 4. Testing Phase
1. Write unit tests
2. Test with sample data
3. Validate output correctness
4. Performance testing

### 5. Documentation Phase
1. Update protocol documentation
2. Add usage examples
3. Document limitations and known issues
4. Update main README if necessary

## Package Management

### Adding New Packages
1. Research package suitability
2. Check for security vulnerabilities
3. Verify compatibility with existing code
4. Install with pnpm:
   ```bash
   pnpm add package-name
   ```

### Updating Packages
1. Review changelogs before updating
2. Test compatibility after updates
3. Update package.json with exact versions
4. Document breaking changes

## Deployment Process

### Staging Deployment
1. Deploy to Heroku staging environment
2. Run integration tests
3. Verify functionality
4. Get stakeholder approval

### Production Deployment
1. Merge to main branch
2. Deploy to Heroku production
3. Monitor for issues
4. Rollback if necessary

## Error Handling and Debugging

### Logging
1. Use consistent logging format
2. Include context information
3. Log errors with stack traces
4. Avoid logging sensitive data

### Debugging Process
1. Reproduce the issue in sandbox
2. Add debug logging if needed
3. Fix the issue
4. Add tests to prevent regression

## Security Considerations

### Input Validation
1. Sanitize all user inputs
2. Validate against protocol specifications
3. Prevent injection attacks
4. Limit input sizes

### Output Sanitization
1. Sanitize generated outputs
2. Prevent XSS in preview panels
3. Secure file downloads
4. Validate export formats

## Performance Optimization

### Best Practices
1. Implement caching for expensive operations
2. Use lazy loading for large components
3. Optimize algorithms for large data sets
4. Monitor memory usage

### Profiling
1. Use browser dev tools for performance profiling
2. Identify bottlenecks
3. Optimize critical paths
4. Test with realistic data sizes

## Collaboration Guidelines

### Communication
1. Use GitHub issues for task tracking
2. Document decisions in PR descriptions
3. Update status regularly
4. Ask for help when blocked

### Code Style
1. Follow existing code patterns
2. Use consistent naming conventions
3. Add comments for complex logic
4. Keep functions focused and small

## Backup and Recovery

### Version Control
1. Commit regularly
2. Use descriptive commit messages
3. Create branches for experiments
4. Tag releases

### Data Backup
1. Keep backups of important test data
2. Document test scenarios
3. Store configuration files
4. Maintain environment setup scripts