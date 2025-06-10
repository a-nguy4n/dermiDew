from fastapi import FastAPI, HTTPException, Query, Request, status, Form, Depends, Body, APIRouter
from fastapi.responses import Response      
from fastapi.responses import RedirectResponse    
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid, httpx, asyncio, requests, json
from typing import Dict
from contextlib import asynccontextmanager
import mysql.connector as mysql
import sys
import os, secrets, uvicorn
from dotenv import load_dotenv
from urllib.request import urlopen
from pathlib import Path
from openai import OpenAI

load_dotenv()

client = OpenAI()

DB_HOST = os.getenv("MYSQL_HOST")
DB_USER = os.getenv("MYSQL_USER")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD")
DB_DATABASE = os.getenv("MYSQL_DATABASE")

from app.database import (
    get_db_connection,
    setup_database,
    get_user_by_email,
    get_user_by_id,
    get_skin_profile,
    upsert_skin_profile,
    create_session,
    get_session,
    delete_session,
    create_user,
    record_login,
    get_login_metrics,
    get_current_routine,
    upsert_current_routine,
    add_product_review,
    get_product_reviews
)

INIT_USERS = {"alice@gmail.com": {"password": "pass123", "first_name": "Alice", "last_name": "Smith"}, "bob@gmail.com": {"password": "pass456", "first_name": "Bob", "last_name": "Jones"}}

# database startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for managing application startup and shutdown.
    Handles database setup and cleanup in a more structured way.
    """
    # Startup: Setup resources
    try:
        await setup_database(INIT_USERS)  # Make sure setup_database is async
        print("Database setup completed")
        yield
    finally:
        print("Shutdown completed")

app = FastAPI(lifespan=lifespan)

class User(BaseModel):
    email: str
    password: str

# Sessions
class Session(BaseModel):
    id: str  # session id (UUID as string, for example)
    user_id: int

def read_html(file_path: str) -> str:
   with open(file_path, "r") as f:
       return f.read()

def get_error_html(email: str) -> str:
   error_html = read_html("./app/static/pages/error.html")
   return error_html.replace("{email}", email if email else "unknown user")


@app.post("/sessions")
def create_new_session(session: Session):
    success = create_session(session.user_id, session.id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to create session")
    return {"message": "Session created successfully"}

@app.get("/sessions/{session_id}")
def read_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.delete("/sessions/{session_id}")
def delete_existing_session(session_id: str):
    success = delete_session(session_id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete session")
    return {"message": "Session deleted successfully"}


# ------------- Log in and Sign up Functions -------------
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
   """Show login if not logged in, or redirect to profile page"""
   # Check if sessionId is in attached cookies and validate it
   # if all valid, redirect to /user/{email}
   # if not, show login page
   res = await get_session(request.cookies.get("sessionId"))
   if res:
       user = await get_user_by_id(res["user_id"])
       email = user["email"]
       return RedirectResponse(url=f"/user/{email}")
   return read_html("./app/static/pages/login.html")

@app.post("/login")
async def login(request: Request):
   """Validate credentials and create a new session if valid"""
   # Get email and password from form data
   email = (await request.form()).get("email")
   password = (await request.form()).get("password")

   # Check if email exists and password matches
   user = await get_user_by_email(email)
   if not user or user["password"] != password:
       return HTMLResponse(get_error_html(email))
  
   # Create a new session
   session_id = str(uuid.uuid4())

   # Create response with:
   #   - redirect to /user/{email}
   #   - set cookie with session ID
   #   - return the response
   response = RedirectResponse(url=f"/user/{email}", status_code=status.HTTP_303_SEE_OTHER)
   response.set_cookie(key="sessionId", value=session_id)
   await create_session(user["id"], session_id)

   from app.database import record_login
   record_login(user["id"])

   return response

@app.get("/login_metrics", response_class=JSONResponse)
async def login_metrics(request: Request):
    """
    Returns JSON like:
      {
        "total_logins":    10,
        "current_streak":   4,
        "last_login_date": "2025-06-01"
      }
    """
    # 1) Check for sessionId cookie
    session_id = request.cookies.get("sessionId")
    if not session_id:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})

    # 2) Validate session
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Invalid session"})

    # 3) Fetch metrics
    metrics = get_login_metrics(session["user_id"])
    # Convert last_login_date to ISO if not None
    if metrics["last_login_date"] is not None:
        metrics["last_login_date"] = metrics["last_login_date"].isoformat()
    return metrics


@app.post("/logout")
async def logout():
   """Clear session and redirect to login page"""
   # Create redirect response to /login
   response = RedirectResponse(url="/login")

   # Delete sessionId cookie
   response.delete_cookie(key="sessionId")

   # Return response
   return response

@app.get("/user/{email}", response_class=HTMLResponse)
async def user_page(email: str, request: Request):
   """Show home page if authenticated, error if not"""
   # Get sessionId from cookies
   session_id = request.cookies.get("sessionId")

   # Check if sessionId exists and is valid
   #   - if not, redirect to /login
   session = await get_session(session_id)
   if not session:
       return RedirectResponse(url="/login")

   print(session)
   # Check if session email matches URL email
   #   - if not, return error page using get_error_html with 403 status
   fetched_user = await get_user_by_id(session["user_id"])
   if fetched_user is None or fetched_user["email"] != email:
       return HTMLResponse(content=get_error_html(email), status_code=status.HTTP_403_FORBIDDEN)

   # If all valid, show home page
   else:
       return RedirectResponse(url="/home")

@app.get("/signup", response_class=HTMLResponse)
async def signup_page():
   """Show the signup page."""
   return read_html("./app/static/pages/signup.html")

@app.post("/signup")
async def signup(request: Request, email: str = Form(...), firstname: str = Form(...), lastname: str = Form(...), passwordinput: str = Form(...), password: str = Form(...)):
   """Register a new user and log them in immediately."""
   if passwordinput != password:
        return HTMLResponse("<h3>Passwords do not match!</h3>")
   
   existing_user = await get_user_by_email(email)
   if existing_user:
       return HTMLResponse("<h3>email already exists! Please choose another.</h3>")

   success = await create_user(email, password, firstname, lastname)
   if not success:
       return HTMLResponse("<h3>Failed to create account. Try again later.</h3>")

   # Fetch the newly created user
   user = await get_user_by_email(email)
   if not user:
       return HTMLResponse("<h3>Account creation failed. Try again.</h3>")

   # Create a session for the new user
   session_id = str(uuid.uuid4())
   await create_session(user["id"], session_id)

   # Redirect to user's profile
   response = RedirectResponse(url=f"/user/{email}", status_code=status.HTTP_303_SEE_OTHER)
   response.set_cookie(key="sessionId", value=session_id)

   return response  

# Mount the static directory
app.mount("/static", StaticFiles(directory="./app/static"), name="static")

@app.get("/", response_class=HTMLResponse)
def get_html() -> HTMLResponse:
  with open("./app/index.html") as html:
    return HTMLResponse(content=html.read())

@app.get("/home", response_class=HTMLResponse)
async def home_page(request: Request):
    session_id = request.cookies.get("sessionId")
    if not session_id:
        return RedirectResponse(url="/login")

    session = await get_session(session_id)
    if not session:
        return RedirectResponse(url="/login")

    user = await get_user_by_id(session["user_id"])
    if not user:
        return RedirectResponse(url="/login")

    home_html = read_html("./app/static/pages/home.html")

    full_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    if not full_name:
        full_name = "Unknown User"

    home_html = home_html.replace("User's Name Here", full_name)

    return HTMLResponse(content=home_html)
    
@app.get("/landing", response_class=HTMLResponse)
def get_html() -> HTMLResponse:
    with open("./app/index.html") as html:
        return HTMLResponse(content=html.read())
    
@app.get("/profile", response_class=HTMLResponse)
async def profile_page(request: Request):
    """Show the profile page with user's data."""
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)

    if not session:
        return RedirectResponse(url="/login")

    user = await get_user_by_id(session["user_id"])
    if not user:
        return RedirectResponse(url="/login")

    from app.database import get_skin_profile 

    # Load and personalize static profile.html
    profile_html = read_html("./app/static/pages/profile.html")

    # Fill in basic user info
    full_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    created_date = user.get("created_at")
    if created_date:
        created_date = created_date.strftime("%B %d, %Y")
    else:
        created_date = "Unknown"

    profile_html = profile_html.replace("User Full Name", full_name or "Unknown User")
    profile_html = profile_html.replace("userEmail@somegmail.com", user.get("email", "unknown@example.com"))
    profile_html = profile_html.replace("date account created", created_date)

    skin_data = await get_skin_profile(user["id"])
    skin_json = json.dumps(skin_data or {})

    profile_html += f"""
    <script>
        const loadedSkinProfile = {skin_json};
    </script>
    """

    return HTMLResponse(content=profile_html)

@app.post("/profile/save")
async def save_profile(request: Request, data: dict = Body(...)):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Unauthorized"})

    user_id = session["user_id"]
    await upsert_skin_profile(
        user_id,
        data.get("skin_type", ""),
        data.get("skin_tone", ""),
        data.get("concerns", ""),
        data.get("goals", ""),
        data.get("allergies", "")
    )
    return {"message": "Profile saved successfully"}

from app.database import get_goals, add_goal, delete_goal

@app.get("/goals", response_class=JSONResponse)
async def load_goals(request: Request):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    
    goals = await get_goals(session["user_id"])
    return goals

@app.post("/goals")
async def save_goal(request: Request, data: dict = Body(...)):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})

    goal_type = data.get("goal_type")
    goal_text = data.get("goal_text")
    if goal_type not in ["daily", "weekly", "monthly"] or not goal_text:
        return JSONResponse(status_code=400, content={"error": "Invalid input"})
    
    await add_goal(session["user_id"], goal_type, goal_text)
    return {"message": "Goal saved"}

@app.delete("/goals/{goal_id}")
async def remove_goal(goal_id: int, request: Request):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    
    await delete_goal(goal_id, session["user_id"])
    return {"message": "Goal deleted"}

@app.get("/routine", response_class=JSONResponse)
async def load_routine(request: Request):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    data = await get_current_routine(session["user_id"]) or {}
    return data

@app.post("/routine")
async def save_routine(request: Request, data: dict = Body(...)):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    await upsert_current_routine(
        session["user_id"],
        data.get("morning_cleanser",""),
        data.get("morning_toner",""),
        data.get("morning_moisturizer",""),
        data.get("morning_sunscreen",""),
        data.get("night_cleanser",""),
        data.get("night_toner",""),
        data.get("night_serums",""),
        data.get("night_moisturizer","")
    )
    return {"message": "Routine saved"}

async def upsert_current_routine(
    user_id: int,
    morning_cleanser: str,
    morning_toner: str,
    morning_moisturizer: str,
    morning_sunscreen: str,
    night_cleanser: str,
    night_toner: str,
    night_serums: str,
    night_moisturizer: str
) -> None:
    """
    Inserts a new row if none exists for this user, otherwise updates the existing one.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    # Check if a row already exists
    cur.execute("SELECT 1 FROM current_routine WHERE user_id = %s", (user_id,))
    exists = cur.fetchone() is not None

    if exists:
        # update the existing row
        cur.execute("""
            UPDATE current_routine
               SET morning_cleanser  = %s,
                   morning_toner     = %s,
                   morning_moisturizer = %s,
                   morning_sunscreen = %s,
                   night_cleanser    = %s,
                   night_toner       = %s,
                   night_serums      = %s,
                   night_moisturizer = %s
             WHERE user_id = %s
        """, (
            morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
            night_cleanser, night_toner, night_serums, night_moisturizer,
            user_id
        ))
    else:
        # insert a brand-new row
        cur.execute("""
            INSERT INTO current_routine
              (user_id,
               morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
               night_cleanser, night_toner, night_serums, night_moisturizer)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            morning_cleanser, morning_toner, morning_moisturizer, morning_sunscreen,
            night_cleanser, night_toner, night_serums, night_moisturizer
        ))

    conn.commit()
    cur.close()
    conn.close()

@app.post("/product_reviews")
async def save_product_review(request: Request, data: dict = Body(...)):
    # 1) auth
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    user_id = session["user_id"]

    # 2) write to DB
    await add_product_review(
        user_id,
        data["name"],
        data["type"],
        data["startDate"],
        data.get("endDate"),
        data["rating"],
        data.get("reaction", ""),
        data.get("notes", "")
    )

    return {"message": "Review saved successfully"}

@app.get("/product_reviews", response_class=JSONResponse)
async def load_product_reviews(request: Request):
    session_id = request.cookies.get("sessionId")
    session = await get_session(session_id)
    if not session:
        return JSONResponse(status_code=403, content={"error": "Not logged in"})
    reviews = await get_product_reviews(session["user_id"])
    return reviews


@app.get("/exploreproducts", response_class=HTMLResponse)
def get_html() -> HTMLResponse:
    with open("./app/static/pages/exploreproducts.html") as html:
        return HTMLResponse(content=html.read())
    

@app.get("/aboutus", response_class=HTMLResponse)
def get_html() -> HTMLResponse:
    with open("./app/static/pages/landingSections/about.html") as html:
        return HTMLResponse(content=html.read())
    
@app.get("/help", response_class=HTMLResponse)
def get_html() -> HTMLResponse:
    with open("./app/static/pages/help.html") as html:
        return HTMLResponse(content=html.read())
    
class AnalysisRequest(BaseModel):
    query: str
    image: str = None
    imageUrl: str = None

@app.post("/analysis")
async def get_analysis(request: AnalysisRequest):
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a skin analyzer."},
                {"role": "user",
                "content": [
                    {"type": "text", "text": request.query},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{request.image}"}}
                ]}
            ]
        )
        analysis_results = completion.choices[0].message.content

        return {"response": analysis_results}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app="app.main:app", host="0.0.0.0", port=6543, reload=True)
