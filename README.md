# OMRly Evaluation System

A **local-first OMR sheet evaluation system** for OMRly.
Processes scanned/photographed OMR answer sheets with real computer vision (OpenCV), no cloud AI, no internet required.

---

## Features

- ✅ Create and manage tests locally
- ✅ Import answer keys (JSON or CSV)
- ✅ Upload and process OMR sheet images (JPG/PNG/PDF)
- ✅ Real computer vision bubble detection (OpenCV + NumPy)
- ✅ Supports 200 questions with A/B/C/D/E options
- ✅ Confidence scoring per question
- ✅ AMBIGUOUS detection (flags unclear marks for review)
- ✅ Manual correction interface
- ✅ Scoring: +1 correct / −1.25 wrong / −1 E / 0 unanswered
- ✅ Export results as CSV, JSON, or PDF
- ✅ Evaluation history with full reproducibility
- ✅ No login, no cloud, all data stored locally (SQLite)

---

## Prerequisites

| Software | Version | Install |
|---|---|---|
| Python | 3.10+ | [python.org](https://python.org) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Comes with Node.js |

---

## Installation

### 1. Clone / Extract the project

```
E:\SOFTWARE\SETUP\OMR\omr-evaluator\
├── backend\
├── frontend\
├── data\
└── README.md
```

### 2. Install Backend Dependencies

```powershell
cd E:\SOFTWARE\SETUP\OMR\omr-evaluator\backend
py -m pip install -r requirements.txt
```

> **Note**: If `py` is not found, use `python` or the full path to your Python executable.

### 3. Install Frontend Dependencies (already done during setup)

```powershell
cd E:\SOFTWARE\SETUP\OMR\omr-evaluator\frontend
npm install
```

---

## Running the Application

### Step 1: Start the Backend (FastAPI + OMR Engine)

Open a terminal in the `backend` folder:

```powershell
cd E:\SOFTWARE\SETUP\OMR\omr-evaluator\backend
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

The backend will automatically:
- Create the SQLite database at `data/database/omr.sqlite`
- Create the default OMR template at `data/templates/omrly-default-200.json`

### Step 2: Start the Frontend (Next.js)

Open a **second** terminal in the `frontend` folder:

```powershell
cd E:\SOFTWARE\SETUP\OMR\omr-evaluator\frontend
npm run dev
```

You should see:
```
▲ Next.js 14.x
- Local: http://localhost:3000
```

### Step 3: Open the App

Visit: **http://localhost:3000**

---

## Database Location

```
data\database\omr.sqlite
```

All test data, answer keys, and evaluation results are stored here. Back up this file to preserve your data.

---

## Data Storage Location

```
data\
├── database\
│   └── omr.sqlite          ← Main database
├── tests\
│   └── <test-id>\          ← Per-test files
├── evaluations\
│   └── <eval-id>\
│       ├── original.jpg    ← Uploaded OMR image
│       ├── processed.jpg   ← Detection overlay
│       └── result.json     ← Result snapshot
└── templates\
    └── omrly-default-200.json ← OMR template
```

---

## Creating a Test

1. Click **"Create Test"** on the dashboard or go to **Tests → Create Test**
2. Enter:
   - **Test Name** (e.g. "NEET Mock Test 01")
   - **Total Questions** (1–200)
   - **Scoring rules** (defaults: +1 / −1.25 / −1 / 0)
3. Upload an **answer key** (JSON or CSV format)
4. Click **"Create Test"**

---

## Importing Answer Keys

### JSON Format

```json
{
  "test_name": "Example Test",
  "questions": [
    {"question": 1, "answer": "A"},
    {"question": 2, "answer": "C"},
    {"question": 3, "answer": "D"}
  ]
}
```

Or simple array:
```json
[
  {"question": 1, "answer": "A"},
  {"question": 2, "answer": "C"}
]
```

### CSV Format

```csv
question,answer
1,A
2,C
3,D
4,B
5,A
```

**Validation rules:**
- Question numbers must be 1–200
- No duplicate question numbers
- Answers must be A, B, C, or D (E is NOT a valid key answer)

---

## Calibrating the OMR Template

The default template is calibrated for the **OMRly 200-question OMR** sheet (4 columns × 50 rows, options A–E horizontal).

To calibrate for a different sheet:

1. Go to **Templates** in the sidebar
2. Click each column section to expand it
3. Adjust coordinates:
   - **Start X** — X position of option A bubble in that column
   - **Start Y** — Y position of the first question row
   - **Row Height** — vertical distance between rows
   - **Option Spacing** — horizontal gap between A,B,C,D,E bubbles
   - **Bubble Radius** — size of each bubble circle
4. Save the template
5. Process a test OMR image and check **"View Detection Preview"** on the result page
6. Fine-tune if needed

All coordinates are in the **normalized 1000×1400 pixel** space after perspective correction.

---

## Processing an OMR Sheet

1. Open a test (from **Tests** page)
2. Click **"Process OMR"**
3. Drop or select the OMR image (JPG/PNG/PDF)
4. Click **"Process OMR Sheet"**
5. The system will:
   - Validate image quality
   - Detect the sheet boundary
   - Apply perspective correction
   - Detect bubble fill ratios using OpenCV
   - Classify each bubble as A/B/C/D/E/UNANSWERED/AMBIGUOUS
6. You'll be redirected to the **Review** page

---

## Reviewing Results

After processing, the **Review** page shows:

- All detected answers with confidence scores
- Manual override dropdowns for any question
- Filter by CORRECT / WRONG / E / UNANSWERED / AMBIGUOUS
- AMBIGUOUS questions are highlighted for attention

When ready, click **"Save & Finalize Score"**.

---

## Exporting Results

On the result page, use the export buttons:

- **⬇ CSV** — Question-wise table with all columns
- **⬇ JSON** — Full structured evaluation data
- **⬇ PDF** — Printable result report

---

## Troubleshooting OMR Detection

| Problem | Possible Fix |
|---|---|
| "Unable to detect OMR sheet" | Ensure the sheet fills most of the frame; better lighting |
| Many AMBIGUOUS results | Lower `fill_threshold` in `backend/app/core/config.py` |
| Bubbles misaligned | Calibrate template coordinates (see Templates page) |
| All answers wrong | Check that the template matches your OMR sheet format |
| Image too blurry | Use a higher resolution scan/photo |
| Processing fails on PDF | Install poppler: `choco install poppler` |

### Adjusting Detection Parameters

Edit `backend/app/core/config.py`:

```python
OMR_FILL_THRESHOLD: float = 0.35    # Lower = more sensitive to lightly filled bubbles
OMR_CONFIDENCE_THRESHOLD: float = 0.80
OMR_AMBIGUITY_MARGIN: float = 0.10  # Lower = less aggressive AMBIGUOUS flagging
```

Restart the backend after changes.

---

## Running Tests (Backend)

```powershell
cd E:\SOFTWARE\SETUP\OMR\omr-evaluator\backend
py -m pytest tests/ -v
```

---

## API Documentation

When the backend is running, visit:
- **http://localhost:8000/docs** — Interactive API docs (Swagger UI)
- **http://localhost:8000/redoc** — ReDoc API docs

---

## Architecture

```
Next.js (http://localhost:3000)
  ↓ HTTP API calls
FastAPI (http://localhost:8000)
  ↓
OMR Processing Engine (OpenCV + NumPy)
  ↓
SQLite Database (data/database/omr.sqlite)
```

**OMR Engine Modules:**
- `preprocessing.py` — resize, grayscale, noise reduction, thresholding
- `sheet_detection.py` — contour-based sheet boundary detection
- `perspective.py` — perspective transformation to 1000×1400 px
- `template.py` — bubble grid coordinate system
- `bubble_detection.py` — fill ratio calculation per bubble
- `answer_detection.py` — A/B/C/D/E/UNANSWERED/AMBIGUOUS classification
- `confidence.py` — 0.0–1.0 confidence scoring
- `visualization.py` — detection overlay image generation
- `pipeline.py` — orchestrates all modules

---

