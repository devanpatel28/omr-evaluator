"""
OMR Template System — defines bubble grid coordinates for a specific OMR sheet layout.

The GCA "Khaki Factory" OMR sheet has:
  - 200 questions in 4 columns of 50 rows each
  - 5 options per question: A, B, C, D, E (horizontal)
  - Normalized to 1000×1400 pixels after perspective correction

Template coordinates are expressed in the normalized (1000×1400) coordinate space.
"""
import json
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, asdict, field


@dataclass
class BubbleCoord:
    """Center coordinate and radius of a single bubble."""
    x: float
    y: float
    radius: float


@dataclass
class GridSection:
    """
    Defines one column group of questions.
    e.g. Q1-50 is one section, Q51-100 is another, etc.
    """
    start_question: int
    end_question: int
    start_x: float        # X of leftmost bubble (option A) center
    start_y: float        # Y of first question row center
    row_height: float     # Vertical spacing between question rows
    option_spacing: float # Horizontal spacing between option bubbles
    bubble_radius: float  # Radius of each bubble


@dataclass
class OMRTemplate:
    name: str
    page_width: int
    page_height: int
    total_questions: int
    options: List[str]
    sections: List[GridSection]

    def get_bubble_coords(self, question_number: int, option_index: int) -> Optional[BubbleCoord]:
        """
        Get the center (x, y) and radius of a specific bubble.
        
        Args:
            question_number: 1-indexed question number
            option_index: 0=A, 1=B, 2=C, 3=D, 4=E
        """
        for section in self.sections:
            if section.start_question <= question_number <= section.end_question:
                row = question_number - section.start_question
                cx = section.start_x + option_index * section.option_spacing
                cy = section.start_y + row * section.row_height
                return BubbleCoord(x=cx, y=cy, radius=section.bubble_radius)
        return None

    def get_all_bubbles_for_question(self, question_number: int) -> List[BubbleCoord]:
        """Return bubble coordinates for all options of a question."""
        coords = []
        for i in range(len(self.options)):
            coord = self.get_bubble_coords(question_number, i)
            if coord:
                coords.append(coord)
        return coords

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "page_width": self.page_width,
            "page_height": self.page_height,
            "total_questions": self.total_questions,
            "options": self.options,
            "sections": [asdict(s) for s in self.sections],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "OMRTemplate":
        sections = [GridSection(**s) for s in data.get("sections", [])]
        return cls(
            name=data["name"],
            page_width=data["page_width"],
            page_height=data["page_height"],
            total_questions=data["total_questions"],
            options=data["options"],
            sections=sections,
        )


# ─── GCA Default Template (calibrated to omr.jpg) ─────────────────────────────
#
# The GCA sheet (1000×1400 normalized) has 4 columns × 50 rows.
# After analysis of the provided omr.jpg:
#   - Header/roll area occupies top ~18% (0-252px)
#   - Answer grid starts at ~y=252 and ends at ~y=1340
#   - 50 rows per column → row_height ≈ (1340-252)/49 ≈ 22.2px
#   - 4 columns at x ≈ 72, 322, 572, 822 (leftmost bubble A center)
#   - 5 options with spacing ≈ 20px
#   - Bubble radius ≈ 7px
#
# These values are calibrated estimates. Fine-tune via the calibration tool.

def create_default_gca_template() -> OMRTemplate:
    """Create the default GCA 200-question OMR template."""
    row_height = 22.5
    option_spacing = 26.3
    bubble_radius = 7.0
    start_y = 254.3

    # Column start X positions (center of option A bubble)
    # Sheet width = 1000, 4 columns roughly at 80, 344, 606, 870
    col_starts = [80.0, 344.0, 606.0, 870.0]

    sections = []
    for i, start_x in enumerate(col_starts):
        q_start = i * 50 + 1
        q_end = (i + 1) * 50
        sections.append(GridSection(
            start_question=q_start,
            end_question=q_end,
            start_x=start_x,
            start_y=start_y,
            row_height=row_height,
            option_spacing=option_spacing,
            bubble_radius=bubble_radius,
        ))

    return OMRTemplate(
        name="GCA Default 200 Question OMR",
        page_width=1000,
        page_height=1400,
        total_questions=200,
        options=["A", "B", "C", "D", "E"],
        sections=sections,
    )


def load_template(template_path: str) -> OMRTemplate:
    """Load a template from a JSON file."""
    with open(template_path, "r") as f:
        data = json.load(f)
    return OMRTemplate.from_dict(data)


def save_template(template: OMRTemplate, template_path: str) -> None:
    """Save a template to a JSON file."""
    Path(template_path).parent.mkdir(parents=True, exist_ok=True)
    with open(template_path, "w") as f:
        json.dump(template.to_dict(), f, indent=2)


def ensure_default_template(templates_dir: Path) -> OMRTemplate:
    """
    Ensure the default GCA template exists in templates_dir.
    Creates it if missing.
    """
    default_path = templates_dir / "gca-default-200.json"
    if not default_path.exists():
        template = create_default_gca_template()
        save_template(template, str(default_path))
        return template
    return load_template(str(default_path))
