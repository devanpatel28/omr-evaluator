"""
Export service — generates CSV, JSON, and PDF exports for evaluation results.
"""
import csv
import json
import io
from datetime import datetime
from typing import List, Optional


def export_to_csv(answers: list, evaluation: object, test: object) -> bytes:
    """
    Export evaluation answers to CSV.
    Returns CSV bytes.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Question", "Detected Answer", "Correct Answer",
        "Final Answer", "Result", "Marks", "Confidence %", "Detection Method"
    ])

    for ans in answers:
        writer.writerow([
            ans.question_number,
            ans.detected_answer or "—",
            ans.correct_answer or "—",
            ans.final_answer or ans.detected_answer or "—",
            ans.result_type or "—",
            f"{ans.marks:+.2f}" if ans.marks is not None else "0.00",
            f"{ans.confidence * 100:.1f}%" if ans.confidence is not None else "—",
            ans.detection_method or "AUTO",
        ])

    return output.getvalue().encode("utf-8-sig")


def export_to_json(answers: list, evaluation: object, test: object) -> bytes:
    """
    Export evaluation to structured JSON.
    """
    data = {
        "evaluation_id": evaluation.id,
        "test_name": evaluation.test_name_snapshot or (test.name if test else "Unknown"),
        "date": evaluation.created_at.isoformat() if evaluation.created_at else None,
        "summary": {
            "total_marks": evaluation.total_marks,
            "correct": evaluation.correct_count,
            "wrong": evaluation.wrong_count,
            "e": evaluation.e_count,
            "unanswered": evaluation.unanswered_count,
            "ambiguous": evaluation.ambiguous_count,
        },
        "scoring": {
            "correct_marks": evaluation.correct_marks_snapshot,
            "wrong_marks": evaluation.wrong_marks_snapshot,
            "e_marks": evaluation.e_marks_snapshot,
            "unanswered_marks": evaluation.unanswered_marks_snapshot,
        },
        "questions": [
            {
                "question": ans.question_number,
                "detected_answer": ans.detected_answer,
                "correct_answer": ans.correct_answer,
                "final_answer": ans.final_answer or ans.detected_answer,
                "result": ans.result_type,
                "marks": ans.marks,
                "confidence": round(ans.confidence, 4) if ans.confidence else None,
                "detection_method": ans.detection_method,
            }
            for ans in answers
        ],
    }
    return json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")


def export_to_pdf(answers: list, evaluation: object, test: object) -> bytes:
    """
    Generate a printable PDF result report using ReportLab.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph,
            Spacer, HRFlowable
        )
        from reportlab.lib.units import cm
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        raise RuntimeError("ReportLab is not installed. Run: pip install reportlab")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=18, textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#6b7280"),
        alignment=TA_CENTER, spaceAfter=4,
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=12, textColor=colors.HexColor("#1a1a2e"),
        spaceBefore=10, spaceAfter=4,
    )
    normal_style = ParagraphStyle(
        "Normal2", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#374151"),
    )

    test_name = evaluation.test_name_snapshot or (test.name if test else "Unknown Test")
    date_str = evaluation.created_at.strftime("%d %b %Y %H:%M") if evaluation.created_at else "—"

    story.append(Paragraph("OMR Evaluation Result", title_style))
    story.append(Paragraph(f"OMRly", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Spacer(1, 0.3*cm))

    # Test info
    info_data = [
        ["Test Name:", test_name],
        ["Date:", date_str],
        ["Total Questions:", str(len(answers))],
    ]
    info_table = Table(info_data, colWidths=[5*cm, 10*cm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7280")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#111827")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4*cm))

    # Score Summary
    story.append(Paragraph("Score Summary", heading_style))

    summary_data = [
        ["", "Count", "Marks"],
        ["✓  Correct", str(evaluation.correct_count), f"+{evaluation.correct_count * evaluation.correct_marks_snapshot:.2f}"],
        ["✗  Wrong", str(evaluation.wrong_count), f"{evaluation.wrong_count * evaluation.wrong_marks_snapshot:.2f}"],
        ["E  Don't Know", str(evaluation.e_count), f"{evaluation.e_count * evaluation.e_marks_snapshot:.2f}"],
        ["—  Unanswered", str(evaluation.unanswered_count), "0.00"],
        ["?  Ambiguous", str(evaluation.ambiguous_count), "0.00"],
        ["FINAL SCORE", "", f"{evaluation.total_marks:.2f}"],
    ]

    summary_table = Table(summary_data, colWidths=[8*cm, 3*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#e5e7eb")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#dbeafe")),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#f9fafb")]),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.6*cm))

    # Question-wise table
    story.append(Paragraph("Question-wise Result", heading_style))

    result_color_map = {
        "CORRECT": colors.HexColor("#dcfce7"),
        "WRONG": colors.HexColor("#fee2e2"),
        "E": colors.HexColor("#ffedd5"),
        "UNANSWERED": colors.HexColor("#f3f4f6"),
        "AMBIGUOUS": colors.HexColor("#fef9c3"),
    }

    q_data = [["Q#", "Detected", "Correct", "Result", "Marks", "Conf%", "Method"]]
    row_colors = [colors.HexColor("#1a1a2e")]

    for ans in answers:
        row = [
            str(ans.question_number),
            ans.final_answer or ans.detected_answer or "—",
            ans.correct_answer or "—",
            ans.result_type or "—",
            f"{ans.marks:+.2f}" if ans.marks is not None else "0.00",
            f"{ans.confidence*100:.0f}%" if ans.confidence is not None else "—",
            ans.detection_method or "AUTO",
        ]
        q_data.append(row)
        row_colors.append(result_color_map.get(ans.result_type, colors.white))

    q_table = Table(
        q_data,
        colWidths=[1.2*cm, 1.8*cm, 1.8*cm, 2.8*cm, 2*cm, 1.8*cm, 2.2*cm],
        repeatRows=1,
    )
    q_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#d1d5db")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ])
    for i, color in enumerate(row_colors[1:], start=1):
        q_style.add("BACKGROUND", (0, i), (-1, i), color)
    q_table.setStyle(q_style)

    story.append(q_table)

    doc.build(story)
    return buffer.getvalue()
