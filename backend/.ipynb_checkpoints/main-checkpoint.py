
API_KEY = "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"

import logging
import os
import json
import fitz  # PyMuPDF for reading PDFs
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import anthropic
import time
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
from fastapi_cache.decorator import cache
from redis import asyncio as aioredis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
frontend_build_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "react_frontend", "build"))
if os.path.exists(frontend_build_dir):
    app.mount("/static", StaticFiles(directory=frontend_build_dir), name="static")
else:
    print(f"Warning: Frontend build directory not found at {frontend_build_dir}")

@app.on_event("startup")
async def startup():
    redis = aioredis.from_url("redis://localhost", encoding="utf8", decode_responses=True)
    FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    await FastAPILimiter.init(redis)

@app.get("/")
async def read_root():
    index_path = os.path.join(frontend_build_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to the PDF Analyzer API"}

@app.get("/favicon.ico")
async def favicon():
    return FileResponse(os.path.join(frontend_build_dir, "favicon.ico"))






def read_pdf_text(file_path):
    """Reads text from a PDF file and returns it as a string."""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        logging.error(f"Error reading PDF: {str(e)}")
        raise
    finally:
        if 'doc' in locals():
            doc.close()

def analyze_bill(bill_text):
    """Analyze the bill text using the Anthropic API."""
    client = anthropic.Client(api_key=API_KEY)
    prompt = f"""Analyze the following Australian parliamentary bill.
    Summarize in simple English so even a 12-year-old can understand, and explain the bill's main purpose. 
    Highlight key provisions or changes proposed.
    
    Provide:
    1. A summary 
    2. Key points  
    3. Possible arguments for
    4. Possible arguments against

    Bill text:
    {bill_text[:10000]}  # Limit text to avoid exceeding token limits

    Please use British English. Use simple language that is accessible to the general public. Avoid technical jargon where possible.
    Format your response as a JSON object with keys: "summary", "key_points", "arguments_for", "arguments_against".
    """

    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
            system="You are an Australian Parliamentary Bill Analyst responsible for understanding, analyzing, and summarizing legislative bills. You use simple language that is accessible to the general public and avoid technical jargon where possible.",
        )
        logging.info(f"Response created")
        return response
    except Exception as e:
        logging.error(f"Error analyzing bill with Anthropic API: {str(e)}")
        raise

def parse_analysis(response):
    """Parse the API response and return a structured analysis."""
    try:
        content_text = response.content[0].text
        
    # Find the start and end of the JSON object
        # Attempt to extract JSON object from the content_text
        start_index = content_text.index("{")
        end_index = content_text.rindex("}") + 1
        json_content = content_text[start_index:end_index]

        # Parse the JSON content
        analysis = json.loads(json_content)
        logging.info(f"Content: {analysis}")
        return analysis
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse analysis result as JSON: {str(e)}")
        raise

def save_analysis_to_file(analysis, output_file_path):
    """Save the analysis results to a text file."""
    try:
        with open(output_file_path, 'w') as file:
            file.write("Summary:\n")
            logging.info(f"Content: {analysis}")
            file.write(analysis["summary"] + "\n")
            
            file.write("\nKey Points:\n")
            for point in analysis["key_points"]:
                file.write(f"- {point}\n")
            
            file.write("\nArguments For:\n")
            for arg in analysis["arguments_for"]:
                file.write(f"- {arg}\n")
            
            file.write("\nArguments Against:\n")
            for arg in analysis["arguments_against"]:
                file.write(f"- {arg}\n")
            
        logging.info(f"Analysis saved to {output_file_path}")
    except Exception as e:
        logging.error(f"Error saving analysis to file: {str(e)}")
        raise

async def process_file(file_path, output_file_path):
    try:
        bill_text = read_pdf_text(file_path)
        analysis_text = analyze_bill(bill_text)
        analysis = parse_analysis(analysis_text)
        save_analysis_to_file(analysis, output_file_path)
        return analysis
    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
        raise
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/api/analyze/")
async def analyze_uploaded_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    limiter: RateLimiter = Depends(RateLimiter(times=5, seconds=60))
):
    start_time = time.time()
    logging.info(f"Received file for analysis: {file.filename}")

    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_path = f"temp_{file.filename}"
    output_file_path = f"analysis_{file.filename}.txt"

    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        analysis = await process_file(file_path, output_file_path)

        logging.info(f"File processed in {time.time() - start_time:.2f} seconds")
        
        return JSONResponse(content=analysis)
    except Exception as e:
        logging.error(f"Error processing file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the file: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3005, log_level="info")