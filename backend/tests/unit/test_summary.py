import json
from typing import Any

import pytest

from app.domain.errors import AppError
from app.infrastructure.pdf import PageText
from app.schemas.models import NOT_FOUND, PaperSummary
from app.services.summary import _MAP_CHARS, summarize


def _summary(**overrides: str) -> str:
    body = {
        "title": "Attention",
        "authors": "A. Author",
        "abstract": "We study attention.",
        "problem_statement": "Long context is expensive.",
        "methodology": "We train a transformer.",
        "key_results": "Accuracy rose.",
        "conclusion": "Attention is useful.",
    }
    body.update(overrides)
    return json.dumps(body)


class ScriptedLlm:
    def __init__(self, replies: list[Any]) -> None:
        self.replies = list(replies)
        self.calls: list[dict[str, Any]] = []

    def complete(
        self,
        messages: list[dict[str, str]],
        *,
        json_schema: dict[str, Any] | None,
        timeout: float,
    ) -> str:
        self.calls.append({"messages": messages, "json_schema": json_schema, "timeout": timeout})
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def test_blank_fields_mean_the_paper_did_not_say() -> None:
    summary = PaperSummary.model_validate(
        json.loads(_summary(title="  ", problem_statement=""))
    )
    assert summary.title == NOT_FOUND
    assert summary.problem_statement == NOT_FOUND
    assert summary.authors == "A. Author"


def test_direct_summary_uses_the_paper_text() -> None:
    llm = ScriptedLlm([_summary()])
    summary = summarize([PageText(1, "Abstract\nWe study attention.")], llm, 5)
    assert summary.title == "Attention"
    assert len(llm.calls) == 1
    assert llm.calls[0]["json_schema"]["title"] == "PaperSummary"
    assert llm.calls[0]["timeout"] == 5
    user = llm.calls[0]["messages"][1]["content"]
    system = llm.calls[0]["messages"][0]["content"]
    assert "We study attention." in user
    assert NOT_FOUND in system


def test_fenced_json_is_accepted() -> None:
    llm = ScriptedLlm(["```json\n" + _summary(title="Fenced") + "\n```"])
    assert summarize([PageText(1, "A short paper.")], llm, 1).title == "Fenced"
    assert len(llm.calls) == 1


def test_invalid_json_is_repaired_once() -> None:
    llm = ScriptedLlm(["not json", _summary(conclusion="Repaired")])
    summary = summarize([PageText(1, "Conclusion\nDone.")], llm, 1)
    assert summary.conclusion == "Repaired"
    assert len(llm.calls) == 2
    assert NOT_FOUND in llm.calls[1]["messages"][-1]["content"]


def test_second_invalid_response_is_an_error() -> None:
    llm = ScriptedLlm(["not json", "[]"])
    with pytest.raises(AppError) as caught:
        summarize([PageText(1, "Abstract\nText.")], llm, 1)
    assert caught.value.status_code == 502
    assert caught.value.code == "malformed_model_response"
    assert "not json" not in caught.value.message


@pytest.mark.parametrize(
    ("code", "status"),
    [("model_unavailable", 503), ("model_timeout", 504)],
)
def test_model_failures_pass_through(code: str, status: int) -> None:
    llm = ScriptedLlm([AppError(code, "model failed", status)])
    with pytest.raises(AppError) as caught:
        summarize([PageText(1, "Abstract\nText.")], llm, 1)
    assert caught.value.code == code
    assert caught.value.status_code == status


def test_priority_sections_are_summarized_before_the_appendix() -> None:
    pages = [
        PageText(1, "Appendix\nAPPENDIX-TOKEN\n" + ("A" * _MAP_CHARS)),
        PageText(2, "Abstract\nUNIQUE-ABSTRACT"),
        PageText(3, "Results\nUNIQUE-RESULTS\n" + ("R" * _MAP_CHARS)),
    ]

    class RoutingLlm:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []

        def complete(
            self,
            messages: list[dict[str, str]],
            *,
            json_schema: dict[str, Any] | None,
            timeout: float,
        ) -> str:
            self.calls.append(
                {"messages": messages, "json_schema": json_schema, "timeout": timeout}
            )
            return _summary() if json_schema is not None else "noted"

    llm = RoutingLlm()
    summarize(pages, llm, 3)
    assert llm.calls[-1]["json_schema"] is not None
    assert all(call["json_schema"] is None for call in llm.calls[:-1])
    first = llm.calls[0]["messages"][1]["content"]
    assert "UNIQUE-ABSTRACT" in first
    assert "APPENDIX-TOKEN" not in first
    mapped = " ".join(call["messages"][1]["content"] for call in llm.calls[:-1])
    assert "APPENDIX-TOKEN" in mapped
    assert "UNIQUE-RESULTS" in mapped


def test_notes_that_do_not_shrink_are_not_mapped_forever() -> None:
    room = _MAP_CHARS - len("[page 1]\n")
    pages = [PageText(1, "B" * room), PageText(2, "C" * room)]
    llm = ScriptedLlm(["N" * 7_000] * 5 + [_summary()])
    summarize(pages, llm, 1)
    assert len(llm.calls) == 6
    assert llm.calls[-1]["json_schema"] is not None
