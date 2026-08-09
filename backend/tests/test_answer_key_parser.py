"""
Tests for answer key parser — JSON and CSV formats.
"""
import pytest
from app.services.files.answer_key_parser import (
    parse_json_answer_key, parse_csv_answer_key, parse_answer_key
)


class TestJSONParser:
    def test_valid_object_format(self):
        content = '''{"test_name": "Test", "questions": [
            {"question": 1, "answer": "A"},
            {"question": 2, "answer": "B"},
            {"question": 3, "answer": "C"}
        ]}'''
        result = parse_json_answer_key(content, 3)
        assert result.success
        assert len(result.answers) == 3
        assert result.answers[0].answer == "A"
        assert result.answers[2].answer == "C"

    def test_valid_array_format(self):
        content = '[{"question": 1, "answer": "D"}, {"question": 2, "answer": "A"}]'
        result = parse_json_answer_key(content, 2)
        assert result.success
        assert len(result.answers) == 2

    def test_invalid_json(self):
        result = parse_json_answer_key("not valid json", 5)
        assert not result.success
        assert len(result.errors) > 0

    def test_invalid_answer(self):
        content = '[{"question": 1, "answer": "F"}]'
        result = parse_json_answer_key(content, 1)
        assert not result.success
        assert any("F" in e for e in result.errors)

    def test_e_not_allowed_in_key(self):
        content = '[{"question": 1, "answer": "E"}]'
        result = parse_json_answer_key(content, 1)
        assert not result.success

    def test_duplicate_question(self):
        content = '[{"question": 1, "answer": "A"}, {"question": 1, "answer": "B"}]'
        result = parse_json_answer_key(content, 5)
        assert not result.success
        assert any("Duplicate" in e for e in result.errors)

    def test_question_out_of_range(self):
        content = '[{"question": 201, "answer": "A"}]'
        result = parse_json_answer_key(content, 200)
        assert not result.success
        assert any("200" in e for e in result.errors)

    def test_case_insensitive_answer(self):
        content = '[{"question": 1, "answer": "a"}]'
        result = parse_json_answer_key(content, 1)
        assert result.success
        assert result.answers[0].answer == "A"

    def test_missing_warnings(self):
        # Provide only 2 answers but expect 5 → should have warnings about missing
        content = '[{"question": 1, "answer": "A"}, {"question": 2, "answer": "B"}]'
        result = parse_json_answer_key(content, 5)
        assert result.success  # errors only, warnings for missing
        assert len(result.warnings) > 0


class TestCSVParser:
    def test_valid_with_header(self):
        content = "question,answer\n1,A\n2,B\n3,C\n"
        result = parse_csv_answer_key(content, 3)
        assert result.success
        assert len(result.answers) == 3

    def test_valid_no_header(self):
        content = "1,A\n2,B\n3,D\n"
        result = parse_csv_answer_key(content, 3)
        assert result.success

    def test_invalid_answer(self):
        content = "question,answer\n1,Z\n"
        result = parse_csv_answer_key(content, 5)
        assert not result.success

    def test_duplicate_question_csv(self):
        content = "question,answer\n1,A\n1,B\n"
        result = parse_csv_answer_key(content, 5)
        assert not result.success

    def test_empty_csv(self):
        result = parse_csv_answer_key("", 5)
        assert not result.success

    def test_auto_detect_json(self):
        content = '[{"question": 1, "answer": "A"}]'
        result = parse_answer_key(content, "upload.json", 1)
        assert result.success

    def test_auto_detect_csv(self):
        content = "question,answer\n1,A\n"
        result = parse_answer_key(content, "upload.csv", 1)
        assert result.success
