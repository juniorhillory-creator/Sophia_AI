import pymupdf


def build_pdf(pages: list[str]) -> bytes:
    document = pymupdf.open()
    try:
        for text in pages:
            page = document.new_page()
            if text:
                page.insert_text((72, 72), text, fontsize=11)
        return document.tobytes()
    finally:
        document.close()


def build_encrypted_pdf(text: str, password: str) -> bytes:
    document = pymupdf.open()
    try:
        page = document.new_page()
        page.insert_text((72, 72), text, fontsize=11)
        return document.tobytes(
            encryption=pymupdf.PDF_ENCRYPT_AES_256,
            user_pw=password,
            owner_pw=f"{password}-owner",
        )
    finally:
        document.close()
