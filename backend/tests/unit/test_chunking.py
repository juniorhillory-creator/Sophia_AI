from uuid import uuid4

from app.infrastructure.chunking import chunk_pages, split_text
from app.infrastructure.pdf import PageText


def test_short_text_is_one_chunk() -> None:
    assert split_text("Only one paragraph.", 1200, 150) == ["Only one paragraph."]


def test_blank_text_yields_no_chunks() -> None:
    assert split_text("  \n  ", 100, 10) == []


def test_windows_overlap_when_there_is_no_separator() -> None:
    assert split_text("ABCDEFGHIJKL", 6, 2) == ["ABCDEF", "EFGHIJ", "IJKL"]


def test_zero_overlap_does_not_repeat_text() -> None:
    assert split_text("ABCDEFGH", 4, 0) == ["ABCD", "EFGH"]


def test_recursive_split_overlaps_on_word_boundaries() -> None:
    assert split_text("aa bb cc dd", 8, 2) == ["aa bb cc", "cc dd"]


def test_paragraph_longer_than_the_limit_is_split_further() -> None:
    text = "short\n\n" + ("N" * 50)
    chunks = split_text(text, 20, 5)
    assert chunks
    assert all(len(chunk) <= 20 for chunk in chunks)
    assert any("short" in chunk for chunk in chunks)
    assert any(set(chunk) == {"N"} for chunk in chunks)


def test_chunks_keep_page_numbers_and_ids() -> None:
    document_id = uuid4()
    pages = [
        PageText(page_number=1, text="A" * 40),
        PageText(page_number=2, text=""),
        PageText(page_number=3, text="B" * 40),
    ]
    chunks = chunk_pages(document_id, pages, chunk_size=15, chunk_overlap=5)

    page_one = [chunk for chunk in chunks if chunk.page_number == 1]
    page_three = [chunk for chunk in chunks if chunk.page_number == 3]
    assert page_one and page_three
    assert all("B" not in chunk.text for chunk in page_one)
    assert all("A" not in chunk.text for chunk in page_three)
    assert all(chunk.page_number != 2 for chunk in chunks)
    assert page_one[0].index_on_page == 0
    assert page_three[0].index_on_page == 0
    assert page_one[0].chunk_id == f"{document_id}:1:0"
    assert page_three[0].chunk_id == f"{document_id}:3:0"
    assert all(chunk.document_id == document_id for chunk in chunks)
    assert len({chunk.chunk_id for chunk in chunks}) == len(chunks)
