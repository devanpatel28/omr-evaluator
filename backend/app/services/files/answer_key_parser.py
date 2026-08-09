"""
Answer key parser — supports JSON and CSV formats with full validation.
"""
import csv
import json
import io
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass


VALID_ANSWERS = {"A", "B", "C", "D"}


@dataclass
class ParsedAnswer:
    question: int
    answer: str


@dataclass
class ParseResult:
    success: bool
    answers: List[ParsedAnswer]
    errors: List[str]
    warnings: List[str]


def parse_json_answer_key(content: str, total_questions: int) -> ParseResult:
    """
    Parse JSON answer key in either format:
    
    Format 1 (object with questions list):
    {"test_name": "...", "questions": [{"question": 1, "answer": "A"}, ...]}
    
    Format 2 (array):
    [{"question": 1, "answer": "A"}, ...]
    """
    errors = []
    warnings = []
    answers = []

    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        return ParseResult(success=False, answers=[], errors=[f"Invalid JSON: {e}"], warnings=[])

    # Normalize to list
    if isinstance(data, dict):
        questions = data.get("questions", [])
        if not questions:
            return ParseResult(
                success=False, answers=[],
                errors=["JSON object must have a 'questions' array."], warnings=[]
            )
    elif isinstance(data, list):
        questions = data
    else:
        return ParseResult(
            success=False, answers=[],
            errors=["JSON must be an object with 'questions' array or a direct array."], warnings=[]
        )

    seen_questions = set()

    for i, item in enumerate(questions):
        if not isinstance(item, dict):
            errors.append(f"Item {i+1}: Expected object, got {type(item).__name__}")
            continue

        # Extract question number
        q_num = item.get("question") or item.get("q") or item.get("number")
        answer = item.get("answer") or item.get("ans") or item.get("correct")

        if q_num is None:
            errors.append(f"Item {i+1}: Missing 'question' field")
            continue
        if answer is None:
            errors.append(f"Item {i+1}: Missing 'answer' field")
            continue

        # Validate question number
        try:
            q_num = int(q_num)
        except (ValueError, TypeError):
            errors.append(f"Item {i+1}: Question number '{q_num}' is not a valid integer")
            continue

        if q_num < 1 or q_num > 200:
            errors.append(f"Question {q_num}: Number must be between 1 and 200")
            continue

        if q_num > total_questions:
            warnings.append(f"Question {q_num}: Exceeds configured total ({total_questions}), skipping")
            continue

        if q_num in seen_questions:
            errors.append(f"Question {q_num}: Duplicate question number")
            continue

        seen_questions.add(q_num)

        # Validate answer
        answer = str(answer).strip().upper()
        if answer not in VALID_ANSWERS:
            errors.append(f"Question {q_num}: Invalid answer '{answer}'. Allowed: A, B, C, D")
            continue

        answers.append(ParsedAnswer(question=q_num, answer=answer))

    # Check for missing questions
    expected = set(range(1, total_questions + 1))
    found = {a.question for a in answers}
    missing = expected - found
    if missing:
        missing_list = sorted(missing)
        if len(missing_list) <= 10:
            warnings.append(f"Missing answers for questions: {missing_list}")
        else:
            warnings.append(f"Missing answers for {len(missing_list)} questions (e.g. {missing_list[:5]}...)")

    success = len(errors) == 0
    return ParseResult(success=success, answers=answers, errors=errors, warnings=warnings)


def parse_csv_answer_key(content: str, total_questions: int) -> ParseResult:
    """
    Parse CSV answer key.
    
    Expected format:
    question,answer
    1,A
    2,C
    ...
    
    Also supports no-header format if first row is numeric.
    """
    errors = []
    warnings = []
    answers = []
    seen_questions = set()

    reader = csv.reader(io.StringIO(content.strip()))
    rows = list(reader)

    if not rows:
        return ParseResult(success=False, answers=[], errors=["CSV file is empty"], warnings=[])

    # Detect if first row is a header
    start_row = 0
    first_row = [cell.strip().lower() for cell in rows[0]]
    if any(cell in ("question", "q", "number", "no", "answer", "ans") for cell in first_row):
        start_row = 1  # Skip header

    # Determine column indices
    q_col, a_col = 0, 1
    if start_row == 1:
        for i, cell in enumerate(first_row):
            if cell in ("question", "q", "number", "no"):
                q_col = i
            elif cell in ("answer", "ans", "correct"):
                a_col = i

    for row_idx, row in enumerate(rows[start_row:], start=start_row + 1):
        if not row or all(cell.strip() == "" for cell in row):
            continue

        if len(row) < 2:
            errors.append(f"Row {row_idx}: Expected at least 2 columns, got {len(row)}")
            continue

        q_raw = row[q_col].strip() if q_col < len(row) else ""
        a_raw = row[a_col].strip() if a_col < len(row) else ""

        # Validate question number
        try:
            q_num = int(q_raw)
        except ValueError:
            errors.append(f"Row {row_idx}: Invalid question number '{q_raw}'")
            continue

        if q_num < 1 or q_num > 200:
            errors.append(f"Row {row_idx}, Question {q_num}: Number must be between 1 and 200")
            continue

        if q_num > total_questions:
            warnings.append(f"Question {q_num}: Exceeds configured total ({total_questions}), skipping")
            continue

        if q_num in seen_questions:
            errors.append(f"Row {row_idx}, Question {q_num}: Duplicate question number")
            continue

        seen_questions.add(q_num)

        # Validate answer
        answer = a_raw.upper()
        if answer not in VALID_ANSWERS:
            errors.append(f"Row {row_idx}, Question {q_num}: Invalid answer '{a_raw}'. Allowed: A, B, C, D")
            continue

        answers.append(ParsedAnswer(question=q_num, answer=answer))

    # Check for missing questions
    expected = set(range(1, total_questions + 1))
    found = {a.question for a in answers}
    missing = expected - found
    if missing:
        missing_list = sorted(missing)
        if len(missing_list) <= 10:
            warnings.append(f"Missing answers for questions: {missing_list}")
        else:
            warnings.append(f"Missing answers for {len(missing_list)} questions (e.g. {missing_list[:5]}...)")

    success = len(errors) == 0
    return ParseResult(success=success, answers=answers, errors=errors, warnings=warnings)


def parse_answer_key(content: str, filename: str, total_questions: int) -> ParseResult:
    """
    Auto-detect format and parse answer key.
    """
    filename_lower = filename.lower()
    content_stripped = content.strip()

    # Detect format
    if filename_lower.endswith(".json") or content_stripped.startswith(("{", "[")):
        return parse_json_answer_key(content_stripped, total_questions)
    elif filename_lower.endswith(".csv"):
        return parse_csv_answer_key(content_stripped, total_questions)
    else:
        # Try JSON first, then CSV
        if content_stripped.startswith(("{", "[")):
            return parse_json_answer_key(content_stripped, total_questions)
        return parse_csv_answer_key(content_stripped, total_questions)


def answers_to_dict(answers: List[ParsedAnswer]) -> Dict[int, str]:
    """Convert parsed answers list to {question_number: answer} dict."""
    return {a.question: a.answer for a in answers}
