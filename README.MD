# MMHC Backend

This is the backend for the MMHC application.

## Development

### Prerequisites

- Node.js (v20.x or later)
- npm (v10.x or later)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mmhc-backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Configuration

Before running the application, you need to set up your environment variables. Copy the example environment file and rename it to `.env`:

```bash
cp .env.example .env
```

Then, open `.env` and fill in the necessary values (e.g., database credentials, API keys, etc.).

For testing, you might also need to create a `.env.test` file:

```bash
cp .env.test.example .env.test
```

### Running the Application

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm run test
```

### Linting and Formatting

- Lint:
  ```bash
  npm run lint
  ```
- Format:
  ```bash
  npm run format
  ```
- Typecheck:
  ```bash
  npm run typecheck
  ```

## Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks, ensuring code quality and consistency. The following hooks are configured:

- **`pre-commit`**: This hook runs before a commit is created. It utilizes [lint-staged](https://github.com/okonet/lint-staged) to run linters and formatters only on the files that are staged for commit. This ensures that only high-quality, formatted code makes it into the repository.
  - `prettier --write`: Formats staged files using Prettier.
  - `eslint --fix`: Lints and automatically fixes issues in staged files using ESLint.
  - `npm run test`: Runs all tests.
  - `npm run build`: Builds the project.

### How it works

When you attempt to commit changes:

1. Husky intercepts the `git commit` command.
2. `lint-staged` identifies all staged files matching the configured patterns (`*.{ts,js,json,css,md}`).
3. `prettier --write` and `eslint --fix` are executed on these staged files, formatting and fixing any linting issues.
4. The project tests are run via `npm run test`.
5. The project is built via `npm run build`.
6. If all commands pass, the commit is allowed to proceed. If any command fails, the commit is aborted, allowing you to fix the issues.

## Contributing

Please ensure your code adheres to the existing coding style and passes all linting and tests before submitting a pull request.
