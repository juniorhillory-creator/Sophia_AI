import pytest

from app.domain.errors import AppError
from app.infrastructure.pdf import extract_pages
from tests.pdf_bytes import build_encrypted_pdf, build_pdf


def test_extracts_each_page_without_renumbering() -> None:
    pages = extract_pages(build_pdf(["Alpha page", "", "Beta page"]))

    assert [page.page_number for page in pages] == [1, 2, 3]
    assert pages[0].text == "Alpha page"
    assert pages[1].text == ""
    assert pages[2].text == "Beta page"


def test_rejects_bytes_that_are_not_a_pdf() -> None:
    with pytest.raises(AppError) as caught:
        extract_pages(b"this is not a pdf")
    assert caught.value.code == "invalid_pdf"
    assert caught.value.status_code == 400


def test_rejects_pdf_with_no_text() -> None:
    with pytest.raises(AppError) as caught:
        extract_pages(build_pdf(["", "   "]))
    assert caught.value.code == "empty_document"
    assert "no extractable text" in caught.value.message


def test_rejects_password_protected_pdf() -> None:
    with pytest.raises(AppError) as caught:
        extract_pages(build_encrypted_pdf("hidden finding", "secret"))
    assert caught.value.code == "invalid_pdf"
    assert caught.value.status_code == 400
