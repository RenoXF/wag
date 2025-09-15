# 🚀 WAG - WhatsApp Gateway

<div align="center">

<!-- ![WAG Logo](./src/server/client/logo.svg) -->

**A powerful WhatsApp API Gateway built with modern web technologies**

[![License](https://img.shields.io/badge/license-Private-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.2+-orange.svg)](https://bun.sh/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)

</div>

## ✨ Features

- 🔐 **Multi-session WhatsApp connections** - Connect multiple WhatsApp accounts simultaneously
- 📱 **QR Code & Pairing Code authentication** - Flexible authentication methods
- 💬 **Message management** - Send, receive, and manage messages with full media support
- 👥 **Group management** - Create, manage, and interact with WhatsApp groups
- 📊 **Contact management** - Organize and manage your WhatsApp contacts
- 🌐 **Modern web interface** - Beautiful React-based dashboard
- 🚀 **High performance** - Built with Bun runtime for maximum speed
- 📚 **RESTful API** - Well-documented API with Swagger integration
- 🗄️ **PostgreSQL storage** - Reliable data persistence
- 🔄 **Real-time updates** - WebSocket support for live data

## 🏗️ Architecture

WAG is built with a modern, scalable architecture:

- **Backend**: Elysia.js server with TypeScript
- **Frontend**: React 19 with Tailwind CSS
- **Database**: PostgreSQL with custom ORM
- **WhatsApp Integration**: Baileys library
- **Runtime**: Bun for optimal performance
- **UI Components**: Radix UI with custom styling

## 🛠️ Tech Stack

### Backend
- [Bun](https://bun.sh/) - Fast JavaScript runtime
- [Elysia.js](https://elysiajs.com/) - High-performance web framework
- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [PostgreSQL](https://postgresql.org/) - Database
- [TypeScript](https://typescriptlang.org/) - Type safety

### Frontend
- [React 19](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://radix-ui.com/) - Accessible components
- [Lucide React](https://lucide.dev/) - Icons
- [React Router](https://reactrouter.com/) - Navigation

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) v1.2+
- [PostgreSQL](https://postgresql.org/) 12+
- Node.js 18+ (for development tools)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wag
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb wag_db
   
   # Update .env with your database URL
   # DATABASE_URL=postgresql://username:password@localhost:5432/wag_db
   ```

5. **Run the application**
   ```bash
   bun run start
   ```

The application will be available at:
- **Web Interface**: http://localhost:4000
- **API Documentation**: http://localhost:4000/docs
- **Health Check**: http://localhost:4000/status

## 📖 Usage

### Web Interface

1. Navigate to http://localhost:4000
2. Go to the **Connections** page
3. Click "Add Connection" to create a new WhatsApp session
4. Scan the QR code or enter the pairing code
5. Start managing your WhatsApp messages and groups!

### API Usage

WAG provides a comprehensive REST API. Here are some examples:

#### Create a new WhatsApp connection
```bash
curl -X POST http://localhost:4000/connections \
  -H "Content-Type: application/json" \
  -d '{"name": "My WhatsApp", "type": "qr_code"}'
```

#### Send a message
```bash
curl -X POST http://localhost:4000/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123",
    "to": "1234567890@s.whatsapp.net",
    "message": "Hello from WAG!"
  }'
```

For complete API documentation, visit `/docs` when the server is running.

## 🔧 Configuration

WAG can be configured through environment variables:

```env
# Server Configuration
PORT=4000
HOSTNAME=0.0.0.0
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/wag_db

# WhatsApp Configuration (optional)
WA_BROWSER_NAME=WAG
WA_BROWSER_VERSION=1.0.0
```

## 📁 Project Structure

```
├── src/
│   ├── database/           # Database models and utilities
│   │   ├── models/         # Data models (contacts, groups, messages, sessions)
│   │   └── utils/          # Database utilities and serializers
│   ├── server/             # Web server and API
│   │   ├── client/         # React frontend
│   │   ├── connections/    # Connection management API
│   │   ├── groups/         # Group management API
│   │   └── messages/       # Message management API
│   ├── whatsapp/           # WhatsApp integration
│   └── index.ts            # Application entry point
├── scripts/                # Build and utility scripts
└── styles/                 # Global styles
```

## 🧑‍💻 Development

### Available Scripts

```bash
# Start development server
bun run start

# Format code with Biome
bun run format

# Build for production
bun run bundle

# Run tests
bun test
```

### Code Quality

This project uses:
- **Biome** for code formatting and linting
- **TypeScript** for type safety
- **Structured architecture** for maintainability

## 📚 API Reference

The API is automatically documented with Swagger. When the server is running, visit `/docs` for:

- Interactive API explorer
- Request/response schemas
- Authentication details
- Example usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

For support, please:
1. Check the API documentation at `/docs`
2. Review the project issues
3. Contact the development team

---

<div align="center">
  <strong>Built with ❤️ using modern web technologies</strong>
</div>
