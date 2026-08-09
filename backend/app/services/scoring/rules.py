"""
Scoring rules and constants.
These are the default rules for the OMRly system.
"""

# Result types
RESULT_CORRECT = "CORRECT"
RESULT_WRONG = "WRONG"
RESULT_E = "E"
RESULT_UNANSWERED = "UNANSWERED"
RESULT_AMBIGUOUS = "AMBIGUOUS"

# Default marks
DEFAULT_CORRECT_MARKS = 1.0
DEFAULT_WRONG_MARKS = -1.25
DEFAULT_E_MARKS = -1.0
DEFAULT_UNANSWERED_MARKS = 0.0

# Valid answer options for answer key
VALID_KEY_OPTIONS = {"A", "B", "C", "D"}

# All valid bubble options (including E = Don't Know)
VALID_BUBBLE_OPTIONS = {"A", "B", "C", "D", "E"}

# Detection result values
DETECT_UNANSWERED = "UNANSWERED"
DETECT_AMBIGUOUS = "AMBIGUOUS"
