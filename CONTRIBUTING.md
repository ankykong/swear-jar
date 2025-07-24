# Contributing to SwearJar 💰

First off, thank you for considering contributing to SwearJar! It's people like you that make SwearJar such a great tool for breaking bad habits with financial incentives.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [maintainers@swearjar.com](mailto:maintainers@swearjar.com).

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git
- Supabase account and project
- Plaid Developer Account

### Fork the Repository

1. Fork the repo on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/swearjar.git
   cd swearjar
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/swearjar.git
   ```

## 🤝 How Can I Contribute?

### Reporting Bugs 🐛

Before creating bug reports, please check the issue list as you might find that the bug has already been reported. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what behavior you expected**
- **Include screenshots if applicable**
- **Include your environment details** (OS, Node version, browser, etc.)

### Suggesting Enhancements ✨

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior and expected behavior**
- **Explain why this enhancement would be useful**

### Your First Code Contribution 🎯

Unsure where to begin? You can start by looking through these beginner-friendly issues:

- `good first issue` - Issues which should only require a few lines of code
- `help wanted` - Issues which should be a bit more involved than beginner issues

## 🛠️ Development Setup

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

### Project Structure

```
swearjar/
├── api/                    # Vercel serverless functions
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
├── server/                 # Local development backend
│   ├── models/             # Supabase database models
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   └── services/           # Business logic
├── database/               # Database schema and migrations
│   └── schema.sql          # Supabase database schema
├── docs/                   # Documentation
└── .github/                # GitHub templates and workflows
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

**Examples:**
```
feat(auth): add two-factor authentication
fix(api): resolve transaction validation error
docs: update installation instructions
```

### Pull Request Requirements

- [ ] **Descriptive title and description**
- [ ] **Link to related issue(s)**
- [ ] **Tests pass locally**
- [ ] **Code follows style guidelines**
- [ ] **Documentation updated if needed**
- [ ] **No merge conflicts**
- [ ] **Signed commits** (if required)

### Review Process

1. **Automated checks** must pass (CI/CD, tests, linting)
2. **At least one maintainer** must approve the PR
3. **All conversations** must be resolved
4. **Branch must be up to date** with main
5. **Squash and merge** will be used to maintain clean history

## 🎨 Style Guidelines

### JavaScript/React

- Use **ES6+ features** where appropriate
- Follow **React Hooks** patterns
- Use **functional components** over class components
- Implement **proper error handling**
- Write **self-documenting code** with clear variable names

### Code Formatting

We use Prettier for code formatting:

```bash
npm run format
```

### Linting

We use ESLint for code linting:

```bash
npm run lint
npm run lint:fix
```

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Follow **mobile-first** responsive design
- Maintain **consistent spacing** and typography
- Use **semantic color names** from the design system

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write **unit tests** for utility functions
- Write **integration tests** for API endpoints
- Write **component tests** for React components
- Use **descriptive test names**
- Aim for **high test coverage**

## 📚 Documentation

- Update the **README.md** if you change functionality
- Add **JSDoc comments** for functions and components
- Update **API documentation** for endpoint changes
- Include **code examples** in documentation
- Keep documentation **up to date** with code changes

## 🏷️ Issue and PR Labels

### Type Labels
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `question` - Further information is requested

### Priority Labels
- `priority: high` - High priority issue
- `priority: medium` - Medium priority issue
- `priority: low` - Low priority issue

### Status Labels
- `status: needs review` - Needs review from maintainers
- `status: in progress` - Currently being worked on
- `status: blocked` - Blocked by another issue or external factor

### Difficulty Labels
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `advanced` - Requires deep knowledge of the codebase

## 🌟 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **Annual contributor highlights**

## 💬 Community

- **Discussions:** Use GitHub Discussions for questions and ideas
- **Issues:** Use GitHub Issues for bugs and feature requests
- **Discord:** Join our community Discord server (link in README)
- **Email:** Contact maintainers at [maintainers@swearjar.com](mailto:maintainers@swearjar.com)

## 📄 Additional Resources

- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://conventionalcommits.org/)
- [React Documentation](https://reactjs.org/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)

---

**Thank you for contributing to SwearJar! Your efforts help people break bad habits and build better lives. 🎉** 