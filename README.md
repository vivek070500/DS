# D.S. Enterprises - Property Inspection System

A complete property inspection form system for D.S. Enterprises (Engineers, Approved Valuers & Project Consultants).

## Features

- 📝 Multi-step property inspection form
- 📸 Photo upload with drag & drop
- 📥 PDF generation matching company format
- 💾 SQLite database for local storage
- ✏️ Edit and update inspections
- 📜 History of all inspections

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Go + Gin Framework
- **Database**: SQLite
- **PDF Generation**: gofpdf

## Prerequisites

- Node.js 18+ (for frontend)
- Go 1.21+ (for backend)
- Git

## Quick Start

### 1. Start the Backend (Go)

```bash
# Navigate to backend folder
cd backend

# Download dependencies
go mod download

# Run the server
go run cmd/server/main.go
```

The backend will start at `http://localhost:8080`

### 2. Start the Frontend (Next.js)

```bash
# Open a new terminal
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will start at `http://localhost:3000`

### 3. Open in Browser

Visit `http://localhost:3000` to start using the application.

## Project Structure

```
DS project/
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx            # Home page
│   │   ├── form/[id]/page.tsx  # Inspection form
│   │   ├── preview/[id]/page.tsx # Preview & download
│   │   └── history/page.tsx    # Inspection history
│   ├── components/
│   │   ├── Header.tsx
│   │   └── PhotoUploader.tsx
│   └── lib/
│       ├── api.ts              # API client
│       └── types.ts            # TypeScript types
│
├── backend/                     # Go Backend
│   ├── cmd/server/main.go      # Entry point
│   ├── internal/
│   │   ├── handlers/           # HTTP handlers
│   │   ├── models/             # Data models
│   │   ├── database/           # SQLite setup
│   │   └── pdf/                # PDF generation
│   ├── uploads/                # Uploaded photos
│   └── generated_pdfs/         # Generated PDFs
│
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/inspections` | Create new inspection |
| GET | `/api/inspections` | List all inspections |
| GET | `/api/inspections/:id` | Get inspection by ID |
| PUT | `/api/inspections/:id` | Update inspection |
| DELETE | `/api/inspections/:id` | Delete inspection |
| POST | `/api/inspections/:id/photos` | Upload photos |
| DELETE | `/api/inspections/:id/photos/:photoId` | Delete photo |
| GET | `/api/inspections/:id/pdf` | Download PDF |

## User Flow

1. **Home Page**: Enter employee name, location, date, and upload photos
2. **Form Page**: Fill in detailed inspection form (7 sections)
3. **Preview Page**: Review and download PDF report

## Form Sections

1. **Basic Information**: Case type, bank, applicant, project, address
2. **Property Details**: Floors, buildings, wings, flat types, area
3. **Boundaries**: East, West, North, South boundaries
4. **Occupancy**: Status, occupant, age of building
5. **Financial**: Rent, market rate, distances
6. **Amenities**: Flooring, kitchen, windows, tiles
7. **Construction**: For under-construction properties

## Database

The application uses SQLite (`ds_enterprises.db`) for local storage. The database is automatically created on first run.

## Troubleshooting

### Backend won't start
- Make sure Go 1.21+ is installed: `go version`
- Run `go mod download` to get dependencies

### Frontend won't start
- Make sure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and run `npm install` again

### CORS errors
- Make sure backend is running on port 8080
- Make sure frontend is running on port 3000

### PDF not generating
- Check that the backend has write permissions
- Check the `generated_pdfs` folder

## License

Private - D.S. Enterprises

