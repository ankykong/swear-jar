# 💰 SwearJar - Virtual Swear Jar with Plaid Integration

A full-stack application that allows users to create virtual swear jars, invite multiple users to share them, and connect bank accounts through Plaid for seamless money management.

## 🚀 Features

- **Virtual Swear Jars**: Create and manage digital swear jars to track penalties
- **Multi-User Access**: Share jars with friends, family, or colleagues
- **Plaid Integration**: Securely connect bank accounts for deposits and withdrawals
- **Real-time Transactions**: Track all money movements with detailed transaction history
- **Beautiful UI**: Modern, responsive design built with React and Tailwind CSS
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-based Permissions**: Owner, admin, and member roles with different privileges

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Plaid API** for bank connectivity
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Express Validator** for input validation

### Frontend
- **React 18** with hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Heroicons** for icons

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Plaid account and API keys
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/swearjar.git
cd swearjar
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/swearjar
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d

# Plaid Configuration
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret-key
PLAID_ENV=sandbox
PLAID_PRODUCTS=transactions,accounts
PLAID_COUNTRY_CODES=US,CA

# Frontend URL
CLIENT_URL=http://localhost:3000
```

### 4. Plaid Setup

1. Sign up for a [Plaid account](https://plaid.com/)
2. Get your Client ID and Secret from the Plaid Dashboard
3. Add them to your `.env` file
4. Start with the sandbox environment for testing

### 5. Database Setup

Make sure MongoDB is running on your system:

```bash
# For macOS (using Homebrew)
brew services start mongodb-community

# For Ubuntu
sudo systemctl start mongod

# For Windows
net start MongoDB
```

### 6. Run the Application

You can run both the frontend and backend simultaneously:

```bash
# From the root directory
npm run dev
```

Or run them separately:

```bash
# Backend only (from server directory)
cd server && npm run dev

# Frontend only (from client directory)
cd client && npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🎯 Usage

### Getting Started

1. **Sign Up**: Create a new account at `/register`
2. **Create a Swear Jar**: Set up your first virtual swear jar
3. **Connect Bank Account**: Use Plaid Link to connect your bank account
4. **Invite Users**: Share your swear jar with friends or family
5. **Start Collecting**: Add money to the jar when you swear!

### Key Features

#### Swear Jar Management
- Create multiple jars for different purposes
- Set custom penalty amounts for different words
- Configure withdrawal approval requirements
- View detailed statistics and analytics

#### Multi-User Functionality
- Invite users by email
- Assign roles (Owner, Admin, Member)
- Set custom permissions for each member
- Track individual contributions

#### Bank Integration
- Connect multiple bank accounts via Plaid
- Automatic balance updates
- Secure micro-deposit verification
- Real-time transaction syncing

#### Transaction System
- Manual deposits and withdrawals
- Automatic penalty tracking
- Transaction approval workflows
- Detailed transaction history

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure Plaid integration
- Role-based access control

## 🧪 API Documentation

### Authentication Endpoints
```
POST /api/auth/register - Register new user
POST /api/auth/login - Login user
GET /api/auth/me - Get current user
PUT /api/auth/profile - Update profile
PUT /api/auth/change-password - Change password
```

### Swear Jars Endpoints
```
GET /api/swear-jars - Get user's swear jars
POST /api/swear-jars - Create new swear jar
GET /api/swear-jars/:id - Get specific swear jar
PUT /api/swear-jars/:id - Update swear jar
DELETE /api/swear-jars/:id - Delete swear jar
POST /api/swear-jars/:id/invite - Invite user to jar
```

### Transactions Endpoints
```
GET /api/transactions - Get transactions
POST /api/transactions/deposit - Create deposit
POST /api/transactions/withdrawal - Create withdrawal
POST /api/transactions/penalty - Apply penalty
PUT /api/transactions/:id/approve - Approve transaction
```

### Plaid Endpoints
```
POST /api/plaid/link-token - Create Plaid Link token
POST /api/plaid/exchange-token - Exchange public token
GET /api/plaid/accounts - Get connected accounts
POST /api/plaid/accounts/:id/verify - Verify account
```

## 🎨 UI Components

The application includes a comprehensive set of reusable components:

- **Layout Components**: Navbar, Footer, Sidebar
- **UI Components**: Buttons, Forms, Modals, Loading Spinners
- **Feature Components**: SwearJar Cards, Transaction Lists, Bank Account Cards
- **Page Components**: Dashboard, Transactions, Settings

## 🚀 Deployment

### Production Environment

1. Set up production MongoDB database
2. Configure production Plaid environment
3. Set production environment variables
4. Build the frontend:
   ```bash
   cd client && npm run build
   ```
5. Deploy to your hosting platform (Heroku, AWS, etc.)

### Environment Variables for Production
```bash
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
PLAID_ENV=production
PLAID_CLIENT_ID=your-production-plaid-client-id
PLAID_SECRET=your-production-plaid-secret
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🔄 Changelog

### v1.0.0
- Initial release
- User authentication and authorization
- Swear jar creation and management
- Plaid bank account integration
- Transaction system
- Multi-user access and permissions
- Responsive web interface

---

**Made with ❤️ by the SwearJar Team** 