# BillSimplifier
The app aims to simplify and democratize access to legislative information by summarizing Australian parliamentary bills in plain, accessible language. 

# Australian Parliamentary Bill Analyzer
The Australian Parliamentary Bill Analyzer is a powerful web application designed to simplify and summarize complex parliamentary bills. It uses advanced AI technology to analyze PDF documents of bills and provide easy-to-understand summaries, key points, and potential arguments for and against the proposed legislation.
Features

Upload PDF files of Australian parliamentary bills
- AI-powered analysis and summarization
- User-friendly interface for viewing results
- Automatic saving of analysis results
- Rate limiting to prevent API abuse
- Caching for improved performance

# Technologies Used
# Backend

- Python 3.10
- FastAPI: A modern, fast (high-performance) web framework for building APIs with Python
- PyMuPDF (fitz): For reading and extracting text from PDF files
- Anthropic API (Claude AI): For advanced text analysis and summarization
- Redis: For caching and rate limiting
- uvicorn: ASGI server for running the FastAPI application

# Frontend

- React: A JavaScript library for building user interfaces
- Axios: Promise-based HTTP client for making API requests

# DevOps & Utilities

- Docker: For containerization and easy deployment
- dotenv: For managing environment variables
- logging: For application logging
