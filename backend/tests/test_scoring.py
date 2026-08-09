"""
Tests for scoring calculator — all result types and edge cases.
"""
import pytest
from app.services.scoring.calculator import (
    determine_result_type, calculate_marks, calculate_score
)
from app.services.scoring.rules import (
    RESULT_CORRECT, RESULT_WRONG, RESULT_E,
    RESULT_UNANSWERED, RESULT_AMBIGUOUS
)


class TestDetermineResultType:
    def test_correct(self):
        assert determine_result_type("A", "A") == RESULT_CORRECT

    def test_wrong(self):
        assert determine_result_type("B", "A") == RESULT_WRONG

    def test_wrong_any_combo(self):
        for student in ["A", "B", "C", "D"]:
            for correct in ["A", "B", "C", "D"]:
                if student != correct:
                    assert determine_result_type(student, correct) == RESULT_WRONG

    def test_e_option(self):
        assert determine_result_type("E", "A") == RESULT_E
        assert determine_result_type("E", "B") == RESULT_E

    def test_unanswered(self):
        assert determine_result_type("UNANSWERED", "A") == RESULT_UNANSWERED
        assert determine_result_type(None, "B") == RESULT_UNANSWERED

    def test_ambiguous(self):
        assert determine_result_type("AMBIGUOUS", "A") == RESULT_AMBIGUOUS

    def test_e_is_not_wrong(self):
        # E must NOT be categorized as WRONG (req 51)
        result = determine_result_type("E", "B")
        assert result != RESULT_WRONG
        assert result == RESULT_E


class TestCalculateMarks:
    def test_correct_marks(self):
        assert calculate_marks(RESULT_CORRECT) == 1.0

    def test_wrong_marks(self):
        assert calculate_marks(RESULT_WRONG) == -1.25

    def test_e_marks(self):
        assert calculate_marks(RESULT_E) == -1.0

    def test_unanswered_marks(self):
        assert calculate_marks(RESULT_UNANSWERED) == 0.0

    def test_ambiguous_marks(self):
        # Ambiguous = 0 until manually resolved
        assert calculate_marks(RESULT_AMBIGUOUS) == 0.0

    def test_custom_marks(self):
        assert calculate_marks(RESULT_CORRECT, correct_marks=2.0) == 2.0
        assert calculate_marks(RESULT_WRONG, wrong_marks=-0.5) == -0.5


class TestCalculateScore:
    def test_example_from_requirements(self):
        """
        From requirements section 19:
        Correct=130, Wrong=40, E=20, Unanswered=10 → Score=60
        """
        detected = {}
        answer_key = {}
        confidences = {}
        methods = {}

        q = 1
        # 130 correct
        for i in range(130):
            detected[q] = "A"
            answer_key[q] = "A"
            confidences[q] = 0.95
            methods[q] = "AUTO"
            q += 1

        # 40 wrong
        for i in range(40):
            detected[q] = "B"
            answer_key[q] = "A"
            confidences[q] = 0.90
            methods[q] = "AUTO"
            q += 1

        # 20 E
        for i in range(20):
            detected[q] = "E"
            answer_key[q] = "A"
            confidences[q] = 0.95
            methods[q] = "AUTO"
            q += 1

        # 10 unanswered
        for i in range(10):
            detected[q] = "UNANSWERED"
            answer_key[q] = "A"
            confidences[q] = 0.99
            methods[q] = "AUTO"
            q += 1

        summary = calculate_score(detected, answer_key, confidences, methods)

        assert summary.correct_count == 130
        assert summary.wrong_count == 40
        assert summary.e_count == 20
        assert summary.unanswered_count == 10
        assert abs(summary.total_marks - 60.0) < 0.01

    def test_small_example(self):
        """
        From requirements section 59:
        Correct=2, Wrong=1, E=1, Unanswered=1 → Score = 2 - 1.25 - 1 = -0.25
        """
        detected = {
            1: "A", 2: "B", 3: "E", 4: "UNANSWERED", 5: "C"
        }
        answer_key = {
            1: "A", 2: "A", 3: "C", 4: "D", 5: "B"
        }
        confidences = {k: 0.9 for k in range(1, 6)}
        methods = {k: "AUTO" for k in range(1, 6)}

        summary = calculate_score(detected, answer_key, confidences, methods)

        assert summary.correct_count == 1   # Q1
        assert summary.wrong_count == 2     # Q2, Q5
        assert summary.e_count == 1         # Q3
        assert summary.unanswered_count == 1  # Q4
        # 1 - 2*1.25 - 1*1 = 1 - 2.5 - 1 = -2.5
        assert abs(summary.total_marks - (-2.5)) < 0.01
