from types import SimpleNamespace

from app.core.settings import Settings
from app.dependencies import get_chat_llm, get_summary_llm


def _request(settings: Settings, *, llm: object, summary_llm: object, chat_llm: object):
    state = SimpleNamespace(
        settings=settings,
        llm=llm,
        summary_llm=summary_llm,
        chat_llm=chat_llm,
    )
    return SimpleNamespace(app=SimpleNamespace(state=state))


def test_cerebras_routes_summary_and_questions_to_task_models() -> None:
    shared = object()
    summary = object()
    chat = object()
    request = _request(
        Settings(ai_provider="cerebras"),
        llm=shared,
        summary_llm=summary,
        chat_llm=chat,
    )

    assert get_summary_llm(request) is summary
    assert get_chat_llm(request) is chat


def test_gemini_keeps_one_model_for_summaries_and_questions() -> None:
    shared = object()
    request = _request(
        Settings(ai_provider="gemini"),
        llm=shared,
        summary_llm=object(),
        chat_llm=object(),
    )

    assert get_summary_llm(request) is shared
    assert get_chat_llm(request) is shared
