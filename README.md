# PDF Organizer

A secure, easy-to-use web application for organizing and processing PDF documents online. PDF Organizer is designed to let users upload documents, rearrange pages, split files, merge multiple PDFs, and download the result without installing desktop software.

> **Project status:** Early frontend prototype. The PDF upload interface is available; document processing, storage, authentication, and downloads are planned and are not yet connected.

## Planned Features

The MVP is focused on reliable page-level PDF operations:

- Upload PDFs by selecting files or using drag and drop
- Merge multiple PDFs in a chosen order
- Split a PDF by page, page range, or fixed page count
- Preview and reorder pages using thumbnails
- Rotate, remove, duplicate, and extract selected pages
- Rename and securely download processed files
- Show processing progress and useful error messages
- Automatically delete uploaded and generated files after expiration

Future releases may add compression, watermarks, page numbers, password protection, OCR, document conversion, batch processing, and developer APIs.

## Product Goals

- **Simple:** Make common PDF tasks immediately understandable.
- **Fast:** Process smaller operations in the browser where practical.
- **Private:** Keep files private and remove them automatically after processing.
- **Reliable:** Preserve page order and document quality.
- **Accessible:** Support modern desktop and mobile browsers.

## Tech Stack

The current frontend uses:

- [Next.js](https://nextjs.org/) App Router
- [React](https://react.dev/) and TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Base UI](https://base-ui.com/)
- [Hugeicons](https://hugeicons.com/)

The planned architecture uses a hybrid processing model: lightweight operations can run locally in the browser, while larger jobs are sent to isolated cloud workers. See [docs/architecture.md](docs/architecture.md) for details.

## Getting Started

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev    # Start the development server
npm run build  # Create a production build
npm run start  # Start the production server
npm run lint   # Run ESLint
```

## Project Structure

```text
app/              Next.js routes, layout, and global styles
components/ui/    Reusable shadcn UI components
docs/             Product, architecture, security, and roadmap documents
lib/              Shared frontend utilities
public/           Static assets
```

## Documentation

- [Product vision](docs/product-vision.md)
- [MVP scope](docs/mvp-scope.md)
- [Application architecture](docs/architecture.md)
- [Database design](docs/database-design.md)
- [AWS architecture](docs/aws-architecture.md)
- [Security and privacy](docs/security.md)
- [Product roadmap](docs/roadmap.md)
- [Pricing strategy](docs/pricing.md)

## Privacy and Security Direction

PDF files must be treated as untrusted and potentially sensitive. The planned platform uses private object storage, short-lived signed URLs, strict ownership checks, isolated processing workers, encrypted connections, and automatic file expiration. These controls are architectural goals and should not be presented as active guarantees until their implementation has been verified.

## Scope

PDF Organizer is intended for document-level and page-level operations. Full word-processor-style editing of text already embedded in PDFs is outside the initial MVP.
